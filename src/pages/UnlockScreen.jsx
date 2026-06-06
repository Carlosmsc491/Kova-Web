import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { Delete } from 'lucide-react'

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

function PinDot({ filled }) {
  return (
    <div className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
      filled ? 'bg-accent-primary border-accent-primary scale-110' : 'border-text-muted'
    }`} />
  )
}

export default function UnlockScreen() {
  const navigate = useNavigate()
  const { setupPin, unlock, isSetupDone, unlocked, loading, error } = useAuthStore()
  const [pin,     setPin]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [step,    setStep]    = useState('pin') // 'pin' | 'confirm'
  const [shake,   setShake]   = useState(false)
  const isSetup = !isSetupDone()

  useEffect(() => {
    if (unlocked) navigate('/', { replace: true })
  }, [unlocked, navigate])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleDigit = (d) => {
    if (d === '⌫') {
      if (step === 'confirm') setConfirm((p) => p.slice(0, -1))
      else setPin((p) => p.slice(0, -1))
      return
    }
    if (!d) return

    const current = step === 'confirm' ? confirm : pin
    if (current.length >= 6) return
    const next = current + d

    if (step === 'confirm') {
      setConfirm(next)
      if (next.length === 6) handleConfirmSubmit(next)
    } else {
      setPin(next)
      if (next.length >= 4 && !isSetup) handleUnlock(next)
      if (next.length === 6 && isSetup) {
        // Move to confirm step
        setStep('confirm')
      }
    }
  }

  const handleConfirmSubmit = async (confirmPin) => {
    if (confirmPin !== pin) {
      triggerShake()
      setConfirm('')
      return
    }
    const result = await setupPin(pin)
    if (!result.ok) {
      triggerShake()
      setPin('')
      setConfirm('')
      setStep('pin')
    }
  }

  const handleUnlock = async (enteredPin) => {
    const result = await unlock(enteredPin)
    if (!result.ok) {
      triggerShake()
      setPin('')
    }
  }

  const currentPin = step === 'confirm' ? confirm : pin
  const pinLength  = isSetup ? 6 : 4

  return (
    <div className="h-full bg-bg-primary flex flex-col items-center justify-center px-8">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary to-purple-800 flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold font-display">K</span>
        </div>
        <h1 className="text-2xl font-bold font-display text-text-primary">KOVA</h1>
        <p className="text-text-muted text-sm mt-1">Personal Finance OS</p>
      </div>

      {/* Instruction */}
      <p className="text-text-secondary text-base mb-2 font-medium">
        {isSetup
          ? step === 'pin' ? 'Create a PIN (4–6 digits)' : 'Confirm your PIN'
          : 'Enter your PIN'}
      </p>
      {isSetup && step === 'pin' && (
        <p className="text-text-muted text-xs mb-6">Use at least 4 digits</p>
      )}

      {/* PIN dots */}
      <div className={`flex gap-4 mb-8 mt-2 transition-transform ${shake ? 'animate-bounce' : ''}`}>
        {Array.from({ length: pinLength }).map((_, i) => (
          <PinDot key={i} filled={i < currentPin.length} />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-accent-danger text-sm mb-4 text-center">{error}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {DIGITS.map((d, i) => (
          <button
            key={i}
            onClick={() => handleDigit(d)}
            disabled={loading || (!d && d !== '0')}
            className={`h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
              d === '⌫'
                ? 'text-text-muted bg-bg-secondary hover:bg-bg-tertiary'
                : !d
                ? 'invisible'
                : 'text-text-primary bg-bg-secondary hover:bg-bg-tertiary border border-border-color'
            }`}
          >
            {d === '⌫' ? <Delete size={20} className="mx-auto" /> : d}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-6 w-5 h-5 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
      )}

      {/* Reset hint */}
      {!isSetup && (
        <p className="text-text-muted text-xs mt-8 text-center">
          Forgot your PIN? Clear app data in Settings.
        </p>
      )}
    </div>
  )
}
