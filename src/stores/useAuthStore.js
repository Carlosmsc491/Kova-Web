/**
 * Auth store — Firebase Auth with PIN UI.
 * Uses a fixed email so the user only needs to remember their PIN.
 */
import { create } from 'zustand'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '../firebase'

// Fixed email for single-user setup
const KOVA_EMAIL = 'kova-user@kova-app.com'
const SETUP_KEY  = 'kova_setup_done'

export const useAuthStore = create((set, get) => ({
  user:     null,
  unlocked: false,
  loading:  true,
  error:    null,

  // Called once on app mount — subscribe to Firebase auth state
  init: () => {
    onAuthStateChanged(auth, (user) => {
      set({ user, unlocked: !!user, loading: false })
    })
  },

  // First-time setup: create account with PIN as password
  setupPin: async (pin) => {
    set({ error: null, loading: true })
    try {
      const cred = await createUserWithEmailAndPassword(auth, KOVA_EMAIL, pin)
      localStorage.setItem(SETUP_KEY, '1')
      set({ user: cred.user, unlocked: true, loading: false })
      return { ok: true }
    } catch (e) {
      // Account already exists — try signing in
      if (e.code === 'auth/email-already-in-use') {
        return get().unlock(pin)
      }
      set({ error: e.message, loading: false })
      return { ok: false, error: e.message }
    }
  },

  // Unlock with PIN
  unlock: async (pin) => {
    set({ error: null, loading: true })
    try {
      const cred = await signInWithEmailAndPassword(auth, KOVA_EMAIL, pin)
      set({ user: cred.user, unlocked: true, loading: false })
      return { ok: true }
    } catch (e) {
      const msg = e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password'
        ? 'Wrong PIN. Try again.'
        : e.message
      set({ error: msg, loading: false })
      return { ok: false, error: msg }
    }
  },

  lock: async () => {
    await signOut(auth)
    set({ user: null, unlocked: false })
  },

  isSetupDone: () => !!localStorage.getItem(SETUP_KEY),
}))
