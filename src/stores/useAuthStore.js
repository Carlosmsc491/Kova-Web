/**
 * Auth store — Google sign-in, plus an optional on-device PIN lock.
 *
 * The app used to sign in to Firebase with a fixed email and the PIN as the
 * password. That email is in the public source and a 6-digit PIN can be
 * guessed, so the owner now signs in with Google: Google is *linked* to the
 * existing account (same uid, all data stays) and the password login is
 * removed. The PIN only gates the UI on this device and never leaves it.
 */
import { create } from 'zustand'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  linkWithPopup,
  unlink,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth, app } from '../firebase'

const securityAlertFn = httpsCallable(getFunctions(app), 'securityAlert')

// The pre-Google account's email (only used to detect an unlinked account).
export const LEGACY_EMAIL = 'kova-user@kova-app.com'

const lockKey     = (uid) => `kova_lock_${uid}`
const sessionKey  = (uid) => `kova_unlocked_${uid}`
const triesKey    = (uid) => `kova_lock_tries_${uid}`
const resetKey    = (uid) => `kova_pin_reset_${uid}`
const MAX_TRIES   = 5

const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* storage blocked */ } },
  del: (k) => { try { localStorage.removeItem(k) } catch { /* storage blocked */ } },
}
const session = {
  get: (k) => { try { return sessionStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { sessionStorage.setItem(k, v) } catch { /* storage blocked */ } },
  del: (k) => { try { sessionStorage.removeItem(k) } catch { /* storage blocked */ } },
}

async function hashPin(uid, pin) {
  const bytes = new TextEncoder().encode(`kova:${uid}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

const googleProvider = () => {
  const p = new GoogleAuthProvider()
  p.setCustomParameters({ prompt: 'select_account' })
  return p
}

const friendly = (e) => ({
  'auth/popup-closed-by-user':        'Sign-in window was closed.',
  'auth/operation-not-allowed':       'Google sign-in is not enabled in Firebase yet.',
  'auth/unauthorized-domain':         'This site is not an authorized domain in Firebase Authentication.',
  'auth/credential-already-in-use':   'That Google account is already used by another Kova account.',
  'auth/invalid-credential':          'Wrong PIN. Try again.',
  'auth/wrong-password':              'Wrong PIN. Try again.',
  'auth/too-many-requests':           'Too many attempts. Wait a few minutes.',
}[e?.code] ?? e?.message ?? 'Something went wrong.')

const isLegacy = (user) => user?.email === LEGACY_EMAIL && user.providerData.some((p) => p.providerId === 'password')
  && !user.providerData.some((p) => p.providerId === 'google.com')

export const useAuthStore = create((set, get) => ({
  user:     null,
  unlocked: false,  // signed in AND past the device PIN lock (if one is set)
  locked:   false,  // signed in but the device PIN lock is showing
  loading:  true,
  error:    null,

  init: () => {
    onAuthStateChanged(auth, (user) => {
      // Google is the only way in now. A session still open from the old
      // email/password login (e.g. a member who joined before) is ended, so
      // they sign in again with Google — which, for the same Gmail address,
      // lands them in the same account.
      if (user && !user.providerData.some((p) => p.providerId === 'google.com')) {
        signOut(auth)
        set({ user: null, unlocked: false, locked: false, loading: false, error: 'Kova now uses Google sign-in. Continue with Google to get back in.' })
        return
      }
      const locked = !!user && !!store.get(lockKey(user.uid)) && session.get(sessionKey(user.uid)) !== '1'
      set({ user, locked, unlocked: !!user && !locked, loading: false })
    })
  },

  // ── Sign in ────────────────────────────────────────────────────────────────
  signInWithGoogle: async () => {
    set({ error: null, loading: true })
    try {
      const cred = await signInWithPopup(auth, googleProvider())
      session.set(sessionKey(cred.user.uid), '1')
      set({ user: cred.user, locked: false, unlocked: true, loading: false })
      return { ok: true }
    } catch (e) {
      // Popups are often blocked on phones — fall back to a full redirect.
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, googleProvider())
        return { ok: true }
      }
      set({ error: friendly(e), loading: false })
      return { ok: false, error: friendly(e) }
    }
  },

  // Link Google to the signed-in legacy account, then remove the password
  // (PIN) login so it can't be used or guessed from anywhere anymore.
  needsGoogleLink: () => isLegacy(auth.currentUser),
  linkGoogle: async () => {
    set({ error: null })
    const user = auth.currentUser
    if (!user) return { ok: false, error: 'Not signed in.' }
    try {
      await linkWithPopup(user, googleProvider())
      await unlink(user, 'password')
      await user.reload()
      set({ user: auth.currentUser })
      return { ok: true }
    } catch (e) {
      set({ error: friendly(e) })
      return { ok: false, error: friendly(e) }
    }
  },

  // ── Device PIN lock (UI only) ──────────────────────────────────────────────
  hasDevicePin: () => { const u = auth.currentUser; return !!u && !!store.get(lockKey(u.uid)) },

  setDevicePin: async (pin) => {
    const u = auth.currentUser
    if (!u) return
    store.set(lockKey(u.uid), await hashPin(u.uid, pin))
    session.set(sessionKey(u.uid), '1')
  },

  removeDevicePin: () => { const u = auth.currentUser; if (u) store.del(lockKey(u.uid)) },

  // After a lockout the PIN is wiped; once Google proves it's the owner, the
  // app asks for a new one.
  needsNewPin: () => { const u = auth.currentUser; return !!u && store.get(resetKey(u.uid)) === '1' },
  clearNeedsNewPin: () => { const u = auth.currentUser; if (u) store.del(resetKey(u.uid)) },

  // 5 wrong PINs and the device is locked out: the PIN is erased, the session
  // ends, and a Telegram alert goes out. Coming back requires Google.
  // Tries 3 and 4 also make you wait (30s, then 60s) before the next one.
  pinWaitUntil: (() => Number(store.get('kova_pin_wait') || 0))(),
  unlockWithDevicePin: async (pin) => {
    const u = get().user
    if (!u) return { ok: false }
    if (Date.now() < get().pinWaitUntil) return { ok: false }
    if (store.get(lockKey(u.uid)) === await hashPin(u.uid, pin)) {
      session.set(sessionKey(u.uid), '1')
      store.del(triesKey(u.uid))
      store.del('kova_pin_wait')
      set({ locked: false, unlocked: true, error: null, pinWaitUntil: 0 })
      return { ok: true }
    }
    const tries = Number(store.get(triesKey(u.uid)) || 0) + 1
    store.set(triesKey(u.uid), String(tries))
    if (tries >= MAX_TRIES) {
      store.del(triesKey(u.uid))
      store.del(lockKey(u.uid))
      store.del('kova_pin_wait')
      store.set(resetKey(u.uid), '1')
      securityAlertFn({ event: 'pin_lockout' }).catch(() => {})
      await get().signOut()
      set({ error: 'Locked after 5 wrong PINs. Sign in with Google to set a new one.', pinWaitUntil: 0 })
      return { ok: false }
    }
    const wait = tries === 3 ? 30_000 : tries === 4 ? 60_000 : 0
    const until = wait ? Date.now() + wait : 0
    if (until) store.set('kova_pin_wait', String(until))
    set({ error: `Wrong PIN. ${MAX_TRIES - tries} ${MAX_TRIES - tries === 1 ? 'try' : 'tries'} left before lockout.`, pinWaitUntil: until })
    return { ok: false }
  },


  // Lock the app on this device (PIN required to come back).
  lock: () => {
    const u = get().user
    if (!u || !store.get(lockKey(u.uid))) return
    session.del(sessionKey(u.uid))
    set({ locked: true, unlocked: false })
  },

  signOut: async () => {
    const u = get().user
    if (u) session.del(sessionKey(u.uid))
    await signOut(auth)
    set({ user: null, unlocked: false, locked: false })
  },
}))
