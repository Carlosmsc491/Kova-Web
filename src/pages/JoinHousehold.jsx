import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore }  from '../stores/useAuthStore'
import { useRoleStore }  from '../stores/useRoleStore'
import { inviteService, profileService, householdDocService } from '../services/firestoreService'

export default function JoinHousehold() {
  const [params]   = useSearchParams()
  const token      = params.get('token')
  const navigate   = useNavigate()

  const registerMember = useAuthStore((s) => s.registerMember)
  const signInMember   = useAuthStore((s) => s.signInMember)
  const initRole       = useRoleStore((s) => s.init)

  const [invite,     setInvite]     = useState(null)
  const [fetching,   setFetching]   = useState(true)
  const [inviteErr,  setInviteErr]  = useState(null)
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formErr,    setFormErr]    = useState(null)

  useEffect(() => {
    if (!token) { navigate('/'); return }
    inviteService.get(token).then((inv) => {
      if (!inv)          setInviteErr('This invite link is invalid.')
      else if (inv.used) setInviteErr('This invite link has already been used.')
      else if (new Date(inv.expires_at) < new Date()) setInviteErr('This invite link has expired.')
      else {
        setInvite(inv)
        if (inv.invited_email) setEmail(inv.invited_email)
      }
      setFetching(false)
    }).catch(() => { setInviteErr('Could not load invite.'); setFetching(false) })
  }, [token, navigate])

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || password.length < 6) {
      setFormErr('Please fill all fields. Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    setFormErr(null)

    if (invite.invited_email && email.trim().toLowerCase() !== invite.invited_email) {
      setFormErr(`This invite is for ${invite.invited_email}. Please use that email address.`)
      setSubmitting(false)
      return
    }

    let result = await registerMember(email.trim(), password)

    // If account exists from a failed previous attempt, sign in and complete setup
    if (!result.ok && result.error?.toLowerCase().includes('already-in-use')) {
      result = await signInMember(email.trim(), password)
      if (!result.ok) {
        setFormErr('An account with this email already exists. Use the same password you chose before, or contact the household owner.')
        setSubmitting(false)
        return
      }
    } else if (!result.ok) {
      setFormErr(result.error)
      setSubmitting(false)
      return
    }

    const uid = useAuthStore.getState().user?.uid
    const hid = invite.household_id
    try {
      await profileService.set(uid, { role: 'member', household_id: hid, name: name.trim() })
      await householdDocService.addMember(hid, uid)
      await inviteService.redeem(token)
      await initRole(uid)
      navigate('/')
    } catch (err) {
      const msg = err?.code || err?.message || String(err)
      setFormErr(`Setup failed: ${msg}`)
      setSubmitting(false)
    }
  }

  const inp = 'w-full bg-bg-secondary border border-border-color rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-colors placeholder:text-text-muted'

  return (
    <div className="h-full bg-bg-primary flex flex-col items-center justify-center px-8">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary to-purple-800 flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold font-display">K</span>
        </div>
        <h1 className="text-2xl font-bold font-display text-text-primary">KOVA</h1>
        <p className="text-text-muted text-sm mt-1">Personal Finance OS</p>
      </div>

      {fetching ? (
        <div className="w-6 h-6 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
      ) : inviteErr ? (
        <div className="bg-accent-danger/10 border border-accent-danger/30 rounded-2xl p-5 text-center max-w-xs">
          <p className="text-accent-danger font-semibold text-sm mb-1">Invite Invalid</p>
          <p className="text-text-muted text-xs">{inviteErr}</p>
        </div>
      ) : (
        <div className="w-full max-w-xs">
          <p className="text-text-secondary text-base font-medium text-center mb-1">Join Household</p>
          <p className="text-text-muted text-xs text-center mb-6">Create your account to get started</p>

          <form onSubmit={handleJoin} className="space-y-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Your name</label>
              <input type="text" className={inp} placeholder="Maria" value={name}
                onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Email</label>
              <input type="email" className={inp} placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                readOnly={!!invite?.invited_email} />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Password <span className="text-text-muted">(min 6 characters)</span></label>
              <input type="password" className={inp} placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            </div>

            {formErr && <p className="text-accent-danger text-xs text-center">{formErr}</p>}

            <button type="submit" disabled={submitting}
              className="w-full bg-accent-primary text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-colors mt-1">
              {submitting
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    Creating account…
                  </span>
                : 'Join Household'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
