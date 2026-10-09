import { useEffect, useState } from 'react'
import Modal from './Modal'
import PinPad from './PinPad'

// Two-step PIN entry (enter, confirm) inside a popup.
export default function SetPinModal({ open, onClose, onSet }) {
  const [first, setFirst] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => { if (open) { setFirst(null); setErr(null) } }, [open])
  return (
    <Modal isOpen={open} onClose={onClose} title="Device PIN">
      <div className="flex flex-col items-center">
        <PinPad key={first ? 'confirm' : 'first'}
          title={first ? 'Confirm the PIN' : 'Choose a 6-digit PIN'}
          subtitle="Only unlocks Kova on this device. It never leaves it."
          onComplete={async (pin) => {
            if (!first) { setFirst(pin); setErr(null); return }
            if (pin !== first) { setFirst(null); setErr("PINs didn't match. Try again."); return }
            await onSet(pin)
            onClose()
          }} />
        {err && <p className="text-accent-danger text-xs mt-3">{err}</p>}
      </div>
    </Modal>
  )
}
