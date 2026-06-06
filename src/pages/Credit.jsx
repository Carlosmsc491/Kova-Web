import { useState, useEffect } from 'react'
import { CreditCard, Plus, Pencil, Trash2, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { useCreditStore }  from '../stores/useCreditStore'
import { useExpenseStore } from '../stores/useExpenseStore'
import { formatCurrency, formatPercent, ordinal } from '../lib/formatters'
import { toast }   from '../stores/useToastStore'
import { logEvent } from '../stores/useHistoryStore'

function daysUntilDay(day) {
  if (!day) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(today.getFullYear(), today.getMonth(), day)
  if (target <= today) target.setMonth(target.getMonth() + 1)
  return Math.round((target - today) / 86400000)
}
function institutionStyle(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('apple'))                                return { bg: 'bg-zinc-600',    text: 'text-white',   abbr: 'AP' }
  if (n.includes('bofa') || n.includes('bank of amer')) return { bg: 'bg-red-700',     text: 'text-white',   abbr: 'BA' }
  if (n.includes('capital one'))                          return { bg: 'bg-red-900',     text: 'text-red-100', abbr: 'C1' }
  if (n.includes('citi'))                                 return { bg: 'bg-blue-700',    text: 'text-white',   abbr: 'CI' }
  if (n.includes('chase'))                                return { bg: 'bg-blue-800',    text: 'text-white',   abbr: 'CH' }
  return { bg: 'bg-bg-tertiary', text: 'text-text-secondary', abbr: (name || '??').slice(0, 2).toUpperCase() }
}
function utilColor(pct) {
  return pct >= 50 ? 'text-accent-danger' : pct >= 30 ? 'text-accent-warning' : 'text-accent-secondary'
}
function utilBar(pct) {
  return pct >= 50 ? 'bg-accent-danger' : pct >= 30 ? 'bg-accent-warning' : 'bg-accent-secondary'
}

// ─── Pay Modal ────────────────────────────────────────────────────────────────
function PayModal({ card, onPay, onClose }) {
  const [amount, setAmount] = useState(String(card.minimum_payment || ''))
  const [paying, setPaying]  = useState(false)

  const handlePay = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setPaying(true)
    try { await onPay(card.id, amt); onClose() }
    finally { setPaying(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}/>
      <div className="relative z-10 w-full sm:max-w-sm bg-bg-secondary border border-border-color rounded-t-3xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-text-primary font-semibold">Pay {card.name}</p>
          <button onClick={onClose} className="p-1.5 text-text-muted"><X size={16}/></button>
        </div>
        <p className="text-text-muted text-xs mb-3">Balance: {formatCurrency(card.current_balance)}</p>
        <div className="space-y-2 mb-4">
          {[{ label: 'Minimum', v: card.minimum_payment }, { label: 'Full balance', v: card.current_balance }].map(({ label, v }) => (
            <button key={label} onClick={() => setAmount(String(v || 0))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors ${String(amount) === String(v) ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-border-color text-text-secondary'}`}>
              <span>{label}</span><span className="font-mono font-bold">{formatCurrency(v)}</span>
            </button>
          ))}
        </div>
        <div className="mb-4">
          <label className="text-xs text-text-muted mb-1 block">Custom amount ($)</label>
          <input type="number" step="0.01" min="0" className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <button onClick={handlePay} disabled={paying || !parseFloat(amount)}
          className="w-full bg-accent-primary text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-colors">
          {paying ? 'Processing…' : `Pay ${formatCurrency(parseFloat(amount) || 0)}`}
        </button>
      </div>
    </div>
  )
}

// ─── Card Tile ────────────────────────────────────────────────────────────────
function CardTile({ card, onEdit, onDelete, onPay }) {
  const inst    = institutionStyle(card.institution)
  const cutDays = daysUntilDay(card.statement_cut_date)
  const dueDays = daysUntilDay(card.payment_due_date)
  const util    = card.utilization_pct ?? 0

  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl p-4 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl ${inst.bg} flex items-center justify-center shrink-0`}>
            <span className={`text-xs font-bold ${inst.text}`}>{inst.abbr}</span>
          </div>
          <div>
            <p className="text-text-primary font-semibold text-sm leading-tight">{card.name}</p>
            <p className="text-text-muted text-xs">{card.institution}</p>
          </div>
        </div>
        <div className="flex gap-0.5">
          <button onClick={() => onPay(card)} className="px-2 py-1 text-xs text-accent-secondary border border-accent-secondary/30 rounded-lg hover:bg-accent-secondary/10 transition-colors font-semibold">Pay</button>
          <button onClick={() => onEdit(card)} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"><Pencil size={12}/></button>
          <button onClick={() => onDelete(card.id)} className="p-1.5 text-text-muted hover:text-accent-danger rounded-lg hover:bg-bg-tertiary transition-colors"><Trash2 size={12}/></button>
        </div>
      </div>
      <p className="text-2xl font-bold font-mono text-text-primary">{formatCurrency(card.current_balance)}</p>
      <p className="text-text-muted text-xs mt-0.5">owed of {formatCurrency(card.credit_limit)} limit</p>
      <div className="mt-3 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-text-muted text-xs">Utilization</span>
          <span className={`text-sm font-bold font-mono ${utilColor(util)}`}>{util.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${utilBar(util)}`} style={{ width: `${Math.min(100, util)}%`}}/>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs mt-auto">
        <div><p className="text-text-muted mb-0.5">Available</p><p className="text-text-secondary font-mono font-medium">{formatCurrency(card.available_credit)}</p></div>
        <div><p className="text-text-muted mb-0.5">APR</p><p className="text-text-secondary font-medium">{card.apr != null ? `${card.apr}%` : '—'}</p></div>
        <div>
          <p className="text-text-muted mb-0.5">Stmt cuts</p>
          <p className="text-text-secondary">{ordinal(card.statement_cut_date)}
            {cutDays != null && <span className={`ml-1 font-medium ${cutDays <= 3 ? 'text-accent-warning' : 'text-text-muted'}`}>· {cutDays}d</span>}
          </p>
        </div>
        <div>
          <p className="text-text-muted mb-0.5">Payment due</p>
          <p className="text-text-secondary">{ordinal(card.payment_due_date)}
            {dueDays != null && <span className={`ml-1 font-medium ${dueDays <= 5 ? 'text-accent-danger' : 'text-text-muted'}`}>· {dueDays}d</span>}
          </p>
        </div>
        <div className="col-span-2"><p className="text-text-muted mb-0.5">Min payment</p><p className="text-text-secondary font-mono font-medium">{formatCurrency(card.minimum_payment)}</p></div>
      </div>
    </div>
  )
}

// ─── Card Form ────────────────────────────────────────────────────────────────
const BLANK_CARD = { name: '', institution: '', credit_limit: '', current_balance: '', apr: '', statement_cut_date: '', payment_due_date: '', minimum_payment: '' }
const PRESETS = [
  { name: 'Apple Card', institution: 'Apple' },
  { name: 'BofA Credit Card', institution: 'Bank of America' },
  { name: 'Capital One Credit Card', institution: 'Capital One' },
  { name: 'Citi Credit Card', institution: 'Citi' },
]
function toForm(c) {
  return {
    name: c.name||'', institution: c.institution||'',
    credit_limit: String(c.credit_limit??''), current_balance: String(c.current_balance??''),
    apr: String(c.apr??''), statement_cut_date: String(c.statement_cut_date??''),
    payment_due_date: String(c.payment_due_date??''), minimum_payment: String(c.minimum_payment??''),
  }
}

function CardForm({ initial, onSave, onCancel, saving, isEditing }) {
  const [form, setForm] = useState(initial || BLANK_CARD)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const inp = 'w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-colors'

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      name: form.name, institution: form.institution,
      credit_limit: parseFloat(form.credit_limit),
      current_balance: parseFloat(form.current_balance) || 0,
      apr: form.apr ? parseFloat(form.apr) : null,
      statement_cut_date: parseInt(form.statement_cut_date),
      payment_due_date: parseInt(form.payment_due_date),
      minimum_payment: parseFloat(form.minimum_payment) || 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-secondary border border-accent-primary/30 rounded-2xl p-4 space-y-3">
      <p className="text-text-primary font-semibold text-sm">{isEditing ? 'Edit Card' : 'Add Card'}</p>
      {!isEditing && (
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.name} type="button" onClick={() => setForm((f) => ({ ...f, ...p }))}
              className="text-xs px-2.5 py-1 border border-border-color rounded-lg text-text-muted hover:text-text-primary hover:border-accent-primary/50 transition-colors">
              {p.name.replace(' Credit Card', '')}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-text-muted mb-1 block">Card Name</label><input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Apple Card" required /></div>
        <div><label className="text-xs text-text-muted mb-1 block">Institution</label><input className={inp} value={form.institution} onChange={(e) => set('institution', e.target.value)} placeholder="Apple" required /></div>
        <div><label className="text-xs text-text-muted mb-1 block">Credit Limit ($)</label><input type="number" step="0.01" min="0" className={inp} value={form.credit_limit} onChange={(e) => set('credit_limit', e.target.value)} placeholder="5000" required /></div>
        <div><label className="text-xs text-text-muted mb-1 block">Balance Owed ($)</label><input type="number" step="0.01" min="0" className={inp} value={form.current_balance} onChange={(e) => set('current_balance', e.target.value)} placeholder="0" /></div>
        <div><label className="text-xs text-text-muted mb-1 block">APR (%)</label><input type="number" step="0.01" min="0" className={inp} value={form.apr} onChange={(e) => set('apr', e.target.value)} placeholder="24.99" /></div>
        <div><label className="text-xs text-text-muted mb-1 block">Min Payment ($)</label><input type="number" step="0.01" min="0" className={inp} value={form.minimum_payment} onChange={(e) => set('minimum_payment', e.target.value)} placeholder="35" /></div>
        <div><label className="text-xs text-text-muted mb-1 block">Stmt Cut Day</label><input type="number" min="1" max="31" className={inp} value={form.statement_cut_date} onChange={(e) => set('statement_cut_date', e.target.value)} placeholder="1" required /></div>
        <div><label className="text-xs text-text-muted mb-1 block">Payment Due Day</label><input type="number" min="1" max="31" className={inp} value={form.payment_due_date} onChange={(e) => set('payment_due_date', e.target.value)} placeholder="28" required /></div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex-1 bg-accent-primary text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : isEditing ? 'Update Card' : 'Add Card'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-text-muted text-sm border border-border-color rounded-xl">Cancel</button>
      </div>
    </form>
  )
}

// ─── Intelligence Panel ───────────────────────────────────────────────────────
function IntelligencePanel({ utilization }) {
  const cards = [...(utilization?.cards ?? [])].sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0))
  const total = utilization?.total_utilization_pct ?? 0
  const candidates = cards.filter((c) => c.utilization_pct < 30)

  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl p-4 space-y-4">
      <p className="text-text-primary font-semibold text-sm">Credit Intelligence</p>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-text-muted text-xs uppercase tracking-wider font-medium">Overall Utilization</span>
          <span className={`text-2xl font-bold font-display ${utilColor(total)}`}>{formatPercent(total)}</span>
        </div>
        <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${utilBar(total)}`} style={{ width: `${Math.min(100, total)}%`}}/>
        </div>
        <p className="text-text-muted text-xs mt-1">{formatCurrency(utilization?.total_balance ?? 0)} of {formatCurrency(utilization?.total_limit ?? 0)}</p>
      </div>
      {cards.length > 0 && (
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wider font-medium mb-2">Avalanche Pay Order</p>
          <div className="space-y-2">
            {cards.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accent-primary/20 text-accent-primary text-xs flex items-center justify-center font-bold shrink-0">{i+1}</span>
                  <div>
                    <p className="text-text-secondary text-sm font-medium">{c.name}</p>
                    <p className="text-text-muted text-xs">{c.apr != null ? `${c.apr}% APR` : 'APR?'} · min {formatCurrency(c.minimum_payment)}</p>
                  </div>
                </div>
                <p className="text-text-primary text-sm font-mono font-bold">{formatCurrency(c.minimum_payment)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {candidates.length > 0 && (
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wider font-medium mb-2">Limit Increase Candidates</p>
          <div className="space-y-2">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <CheckCircle size={13} className="text-accent-secondary shrink-0 mt-0.5"/>
                <p className="text-text-secondary text-xs"><span className="font-medium">{c.name}</span> — {c.utilization_pct.toFixed(1)}% utilization. Request a limit increase if you have 6+ months on-time payments.</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Credit() {
  const { utilization, loading, fetch, create, update, remove, markPaid } = useCreditStore()
  const { expenses } = useExpenseStore()
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [paying,    setPaying]    = useState(null)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { fetch() }, [fetch])

  const handleCreate = async (payload) => { setSaving(true); try { await create(payload); setShowForm(false); toast.success('Card added') } finally { setSaving(false) } }
  const handleUpdate = async (payload) => { setSaving(true); try { await update(editing.id, payload); setEditing(null); toast.success('Card updated') } finally { setSaving(false) } }
  const handleDelete = async (id) => { await remove(id); toast.success('Card removed') }
  const handlePay    = async (id, amount) => {
    await markPaid(id, amount); toast.success('Payment recorded')
    const card = utilization?.cards?.find((c) => c.id === id)
    logEvent('credit_payment', `Paid ${card?.name}`, amount)
  }

  const cards = utilization?.cards ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-text-primary">Credit</h2>
          <p className="text-text-muted text-xs mt-0.5">Cards, utilization & strategy</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null) }}
          className="flex items-center gap-1.5 text-sm text-accent-primary border border-accent-primary/30 rounded-xl px-3 py-2 hover:bg-accent-primary/10 transition-colors">
          <Plus size={14}/> Add Card
        </button>
      </div>

      {(showForm || editing) && (
        <CardForm initial={editing ? toForm(editing) : undefined} onSave={editing ? handleUpdate : handleCreate}
          onCancel={() => { setShowForm(false); setEditing(null) }} saving={saving} isEditing={!!editing} />
      )}

      {!loading && cards.length === 0 && !showForm && (
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-10 text-center">
          <CreditCard size={36} className="text-text-muted mx-auto mb-3"/>
          <p className="text-text-primary font-semibold mb-1">No credit cards yet</p>
          <p className="text-text-muted text-sm mb-4">Add your cards to track utilization.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => setShowForm(true)}
                className="text-xs px-3 py-1.5 border border-border-color rounded-lg text-text-secondary hover:text-accent-primary hover:border-accent-primary/50 transition-colors">
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((card) => (
            <CardTile key={card.id} card={card}
              onEdit={(c) => { setEditing(c); setShowForm(false) }}
              onDelete={handleDelete}
              onPay={(c) => setPaying(c)}
            />
          ))}
        </div>
      )}

      {cards.length > 0 && <IntelligencePanel utilization={utilization} />}

      {paying && <PayModal card={paying} onPay={handlePay} onClose={() => setPaying(null)} />}
    </div>
  )
}
