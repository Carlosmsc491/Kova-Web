import { useState } from 'react'
import { Delete } from 'lucide-react'

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

// Numeric keypad that calls onComplete once `length` digits are entered.
export default function PinPad({ length = 6, onComplete, disabled, title, subtitle }) {
  const [pin, setPin] = useState('')
  const press = (d) => {
    if (disabled) return
    if (d === '⌫') return setPin((p) => p.slice(0, -1))
    if (!d || pin.length >= length) return
    const next = pin + d
    setPin(next)
    if (next.length === length) { onComplete(next); setTimeout(() => setPin(''), 150) }
  }
  return (
    <>
      <p className="text-text-secondary text-base mb-1 font-medium">{title}</p>
      {subtitle && <p className="text-text-muted text-xs mb-2 text-center max-w-xs">{subtitle}</p>}
      <div className="flex gap-4 mb-8 mt-4">
        {Array.from({ length }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${i < pin.length ? 'bg-accent-primary border-accent-primary scale-110' : 'border-text-muted'}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {DIGITS.map((d, i) => (
          <button key={i} onClick={() => press(d)} disabled={disabled || !d}
            className={`h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
              d === '⌫' ? 'text-text-muted bg-bg-secondary hover:bg-bg-tertiary'
              : !d ? 'invisible'
              : 'text-text-primary bg-bg-secondary hover:bg-bg-tertiary border border-border-color'}`}>
            {d === '⌫' ? <Delete size={20} className="mx-auto" /> : d}
          </button>
        ))}
      </div>
    </>
  )
}

