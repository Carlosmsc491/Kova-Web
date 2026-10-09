import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore }  from '../stores/useAuthStore'
import { useRoleStore }  from '../stores/useRoleStore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../firebase'
import { inviteService } from '../services/firestoreService'

const joinHouseholdFn = httpsCallable(getFunctions(app), 'joinHousehold')

export default function JoinHousehold() {
  const [params]   = useSearchParams()
  const token      = params.get('token')
  const navigate   = useNavigate()

  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const initRole       = useRoleStore((s) => s.init)

  const [invite,     setInvite]     = useState(null)
  const [fetching,   setFetching]   = useState(true)
  const [inviteErr,  setInviteErr]  = useState(null)
  const [name,       setName]       = useState('')
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
      }
      setFetching(false)
    }).catch(() => { setInviteErr('Could not load invite.'); setFetching(false) })
  }, [token, navigate])

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setFormErr('Please enter your name.'); return }
    setSubmitting(true)
    setFormErr(null)
    // Members sign in with Google too; the server checks the invite's email
    // against the Google account.
    const result = await signInWithGoogle()
    if (!result.ok) { setFormErr(result.error); setSubmitting(false); return }

    const uid = useAuthStore.getState().user?.uid
    try {
      // The server checks the invite (unused, unexpired, right email) and adds
      // the member — clients can no longer write member lists themselves.
      await joinHouseholdFn({ token, name: name.trim() })
      await initRole(uid)
      navigate('/')
    } catch (err) {
      setFormErr(err?.message || 'Could not join the household.')
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
          <p className="text-text-muted text-xs text-center mb-6">{invite?.invited_email ? `Sign in with Google as ${invite.invited_email}` : "Sign in with your Google account"}</p>

          <form onSubmit={handleJoin} className="space-y-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Your name</label>
              <input type="text" className={inp} placeholder="Maria" value={name}
                onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </div>

            {formErr && <p className="text-accent-danger text-xs text-center">{formErr}</p>}

            <button type="submit" disabled={submitting}
              className="w-full bg-accent-primary text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-colors mt-1">
              {submitting
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    Joining…
                  </span>
                : 'Continue with Google'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
