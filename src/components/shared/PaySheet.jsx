import { useEffect, useState } from 'react'
import { Landmark, CreditCard, CheckCircle } from 'lucide-react'
import Modal from './Modal'
import { useAccountStore } from '../../stores/useAccountStore'
import { useCreditStore }  from '../../stores/useCreditStore'
import { usePaymentStore } from '../../stores/usePaymentStore'
import { toast } from '../../stores/useToastStore'
import { formatCurrency } from '../../lib/formatters'

const fmtDue = (iso) => {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// One place to record any payment.
// target: { kind: 'expense'|'card', id, name, amount, dueDate?, defaultSource? }
//  - expense: paid from a bank account (balance goes down), charged to a
//    credit card (that card's balance goes up), or "already reflected".
//  - card: paid from a bank account, or "already reflected".
export default function PaySheet({ target, onClose, onDone }) {
  const accounts = useAccountStore((s) => s.accounts)
  const cards    = useCreditStore((s) => s.cards)
  const { payExpense, payCard } = usePaymentStore()

  const [amount, setAmount] = useState('')
  const [source, setSource] = useState({ type: 'account', id: null })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!target) return
    setAmount(String(Math.round((target.amount || 0) * 100) / 100))
    const def = target.defaultSource
    const valid = def && (def.type === 'none' || (def.type === 'account' && accounts.some((a) => a.id === def.id)) || (def.type === 'card' && target.kind === 'expense' && cards.some((c) => c.id === def.id)))
    setSource(valid ? def : { type: accounts.length ? 'account' : 'none', id: accounts[0]?.id ?? null })
  }, [target, accounts, cards])

  if (!target) return null
  const amt = parseFloat(amount) || 0
  const options = [
    ...accounts.map((a) => ({ type: 'account', id: a.id, label: a.name, sub: `${formatCurrency(a.current_balance ?? 0)} → ${formatCurrency((a.current_balance ?? 0) - amt)}`, Icon: Landmark })),
    ...(target.kind === 'expense'
      ? cards.filter((c) => c.id).map((c) => ({ type: 'card', id: c.id, label: c.name, sub: `charged · owes ${formatCurrency((c.current_balance ?? 0) + amt)}`, Icon: CreditCard }))
      : []),
    { type: 'none', id: null, label: 'Already reflected', sub: "Don't change any balance", Icon: CheckCircle },
  ]

  const submit = async () => {
    if (!(amt > 0)) return
    setSaving(true)
    try {
      if (target.kind === 'expense') {
        const r = await payExpense(target.id, { amount: amt, source, dueDate: target.dueDate })
        toast.success(r.completed ? `${target.name} paid off! 🎉` : `${target.name} paid`)
      } else {
        await payCard(target.id, { amount: amt, source })
        toast.success(`${formatCurrency(amt)} → ${target.name}`)
      }
      onDone?.()
      onClose()
    } catch (e) {
      toast.error(e.message || 'Could not record the payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Pay ${target.name}`}>
      <div className="space-y-4">
        {target.dueDate && (
          <p className="text-text-muted text-xs">For the payment due <span className="text-text-primary font-semibold">{fmtDue(target.dueDate)}</span>. It won't show again until the next due date.</p>
        )}
        <div>
          <label className="text-xs text-text-muted mb-1 block" htmlFor="pay-amount">Amount</label>
          <div className="flex items-center bg-bg-primary border border-border-color rounded-xl px-3 focus-within:border-accent-primary">
            <span className="text-text-muted">$</span>
            <input id="pay-amount" type="number" step="0.01" min="0" inputMode="decimal" autoFocus
              className="w-full bg-transparent text-text-primary text-lg font-mono py-2.5 pl-1 outline-none"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          {target.quick?.length > 0 && (
            <div className="flex gap-1.5 mt-1.5">
              {target.quick.map((q) => (
                <button key={q.label} type="button" onClick={() => setAmount(String(q.value))}
                  className={`flex-1 text-xs px-2 py-1.5 rounded-lg border ${String(q.value) === amount ? 'border-accent-primary text-accent-primary bg-accent-primary/10' : 'border-border-color text-text-secondary'}`}>
                  {q.label} <span className="font-mono">{formatCurrency(q.value)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1.5">Paid with</p>
          <div className="space-y-1.5">
            {options.map((o) => {
              const active = source.type === o.type && (source.id ?? null) === (o.id ?? null)
              return (
                <button key={`${o.type}-${o.id}`} type="button" onClick={() => setSource({ type: o.type, id: o.id })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${active ? 'border-accent-primary bg-accent-primary/10' : 'border-border-color'}`}>
                  <o.Icon size={15} className={active ? 'text-accent-primary' : 'text-text-muted'} />
                  <div className="min-w-0">
                    <p className={`text-sm ${active ? 'text-accent-primary font-semibold' : 'text-text-primary'}`}>{o.label}</p>
                    <p className="text-text-muted text-[11px] font-mono truncate">{o.sub}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        <button onClick={submit} disabled={saving || !(amt > 0)}
          className="w-full bg-accent-primary text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : `Record ${formatCurrency(amt)} payment`}
        </button>
        <p className="text-text-muted text-[11px] text-center">You can undo it from Recent activity.</p>
      </div>
    </Modal>
  )
}
