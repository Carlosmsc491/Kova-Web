import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PinPad from '../components/shared/PinPad'
import { useAuthStore } from '../stores/useAuthStore'


function Logo() {
  return (
    <div className="mb-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary to-purple-800 flex items-center justify-center mx-auto mb-4">
        <span className="text-white text-2xl font-bold font-display">K</span>
      </div>
      <h1 className="text-2xl font-bold font-display text-text-primary">KOVA</h1>
      <p className="text-text-muted text-sm mt-1">Personal Finance OS</p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  )
}


export default function UnlockScreen() {
  const navigate = useNavigate()
  const { user, unlocked, locked, loading, error, signInWithGoogle, unlockWithDevicePin, signOut, pinWaitUntil } = useAuthStore()
  const [now, setNow] = useState(Date.now())

  useEffect(() => { if (unlocked) navigate('/', { replace: true }) }, [unlocked, navigate])

  // Ticks the countdown while a wrong-PIN delay is running.
  useEffect(() => {
    if (!pinWaitUntil || pinWaitUntil <= Date.now()) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [pinWaitUntil])
  const waitSecs = pinWaitUntil ? Math.max(0, Math.ceil((pinWaitUntil - now) / 1000)) : 0

  // Signed in, but this device has a PIN lock.
  if (user && locked) {
    return (
      <div className="h-full bg-bg-primary flex flex-col items-center justify-center px-8">
        <Logo />
        <PinPad title="Enter your PIN" onComplete={unlockWithDevicePin} disabled={loading || waitSecs > 0} />
        {waitSecs > 0
          ? <p className="text-accent-warning text-sm mt-4 text-center">Too many tries — wait {waitSecs}s</p>
          : error && <p className="text-accent-danger text-sm mt-4 text-center">{error}</p>}
        <button onClick={signOut} className="mt-8 text-text-muted text-xs hover:text-text-secondary">
          Forgot PIN? Recover it by signing in with Google
        </button>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary flex flex-col items-center justify-center px-8">
      <Logo />
      <div className="w-full max-w-xs space-y-3">
        <button onClick={signInWithGoogle} disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-bg-secondary border border-border-color rounded-xl py-3 text-sm font-semibold text-text-primary hover:bg-bg-tertiary disabled:opacity-50">
          <GoogleIcon /> {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
        {error && <p className="text-accent-danger text-xs text-center">{error}</p>}
        <p className="text-text-muted text-[11px] text-center">Only the owner's Google account and invited household members can get in.</p>
      </div>
    </div>
  )
}
