import { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, Home, Car, Zap, Shield,
  Smartphone, Wifi, Tag, DollarSign, X, CheckCircle, Check,
} from 'lucide-react'
import { useExpenseStore }    from '../stores/useExpenseStore'
import { useAccountStore }    from '../stores/useAccountStore'
import { useHouseholdStore }  from '../stores/useHouseholdStore'
import { formatCurrency }   from '../lib/formatters'
import { toast }            from '../stores/useToastStore'
import { logEvent }         from '../stores/useHistoryStore'

const CATEGORIES = [
  { key: 'rent',      Icon: Home,       label: 'Rent',       color: 'text-violet-400' },
  { key: 'car',       Icon: Car,        label: 'Car',        color: 'text-blue-400'   },
  { key: 'utilities', Icon: Zap,        label: 'Utilities',  color: 'text-yellow-400' },
  { key: 'insurance', Icon: Shield,     label: 'Insurance',  color: 'text-green-400'  },
  { key: 'phone',     Icon: Smartphone, label: 'Phone',      color: 'text-purple-400' },
  { key: 'wifi',      Icon: Wifi,       label: 'WiFi',       color: 'text-cyan-400'   },
  { key: 'other',     Icon: Tag,        label: 'Other',      color: 'text-text-muted' },
]
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))
const DUE_TYPES = [{ key: 'monthly', label: 'Monthly' }, { key: 'biweekly', label: 'Biweekly' }, { key: 'one-time', label: 'One-time' }]

function ordinal(n) {
  const v = n % 100
  return n + (['th','st','nd','rd'][(v-20)%10] || ['th','st','nd','rd'][v] || 'th')
}

function isPaidThisCycle(expense) {
  if (!expense.last_paid_date) return false
  const paid = new Date(expense.last_paid_date)
  const now  = new Date()
  if (expense.due_type === 'biweekly') return (now - paid) / 86400000 < 14
  return paid.getFullYear() === now.getFullYear() && paid.getMonth() === now.getMonth()
}

const BLANK = {
  name: '', amount: '', due_day: '1', due_type: 'monthly',
  account_id: '', category: 'other', is_household: false, my_share: '', notes: '',
  expense_type: 'recurring', original_balance: '', remaining_balance: '',
  contributors: [],
}

function toForm(exp) {
  let contributors = (exp.contributors || []).map((c) => ({ ...c, included: c.included !== false }))
  if ((exp.is_household === true || exp.is_household === 1) && contributors.length === 0) {
    contributors = [{ name: 'Me', amount: exp.my_share != null ? String(exp.my_share) : '', included: true }]
  }
  return {
    name:             exp.name,
    amount:           String(exp.amount),
    due_day:          String(exp.due_day || 1),
    due_type:         exp.due_type || 'monthly',
    account_id:       String(exp.account_id || ''),
    category:         exp.category || 'other',
    is_household:     exp.is_household === true || exp.is_household === 1,
    my_share:         exp.my_share != null ? String(exp.my_share) : '',
    notes:            exp.notes || '',
    expense_type:     exp.expense_type || 'recurring',
    original_balance: exp.original_balance != null ? String(exp.original_balance) : '',
    remaining_balance: exp.remaining_balance != null ? String(exp.remaining_balance) : '',
    contributors,
  }
}

// ─── Expense Form ─────────────────────────────────────────────────────────────
function ExpenseForm({ initial, accounts, householdMembers, onSave, onCancel, saving, isEditing }) {
  const [form, setForm] = useState(initial || BLANK)
  const [redistModal, setRedistModal] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const inp = 'w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-colors'
  const isInstallment = form.expense_type === 'installment'

  // Build contributor list from household members (all included by default)
  const buildFromMembers = (total) => {
    const allMembers = [{ name: 'Me' }, ...householdMembers]
    const share = total > 0 ? (total / allMembers.length).toFixed(2) : ''
    return allMembers.map((m) => ({ name: m.name, amount: share, included: true }))
  }

  // When opening a household expense with no contributors saved, populate from members
  useEffect(() => {
    if (form.is_household && form.contributors.length === 0 && householdMembers.length > 0) {
      const total = parseFloat(form.amount) || 0
      const contribs = buildFromMembers(total)
      setForm((f) => ({ ...f, contributors: contribs, my_share: contribs[0]?.amount || '' }))
    }
  }, [form.is_household, householdMembers.length])

  const handleHouseholdToggle = () => {
    const newVal = !form.is_household
    if (newVal) {
      const total = parseFloat(form.amount) || 0
      const contribs = buildFromMembers(total)
      setForm((f) => ({ ...f, is_household: true, contributors: contribs, my_share: contribs[0]?.amount || '' }))
    } else {
      setForm((f) => ({ ...f, is_household: false, contributors: [] }))
    }
  }

  const splitEvenly = () => {
    const total = parseFloat(form.amount) || 0
    const included = form.contributors.filter((c) => c.included)
    if (included.length === 0 || total === 0) return
    const share = (total / included.length).toFixed(2)
    const newContribs = form.contributors.map((c) => c.included ? { ...c, amount: share } : { ...c, amount: '' })
    setForm((f) => ({ ...f, contributors: newContribs, my_share: newContribs[0]?.amount || '' }))
  }

  const toggleContributor = (idx) => {
    const next = form.contributors.map((c, i) => i === idx ? { ...c, included: !c.included } : c)
    const total = parseFloat(form.amount) || 0
    const includedCount = next.filter((c) => c.included).length
    if (total > 0 && includedCount > 0) {
      const share = (total / includedCount).toFixed(2)
      const split = next.map((c) => c.included ? { ...c, amount: share } : { ...c, amount: '' })
      setForm((f) => ({ ...f, contributors: split, my_share: split[0]?.amount || '' }))
    } else {
      setForm((f) => ({ ...f, contributors: next }))
    }
  }

  const updateContributorAmount = (idx, newVal) => {
    const newContribs = form.contributors.map((c, i) => i === idx ? { ...c, amount: newVal } : c)
    const total = parseFloat(form.amount) || 0
    const sumIncluded = newContribs.filter((c) => c.included).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
    const gap = total - sumIncluded
    const myShare = parseFloat(newContribs[0]?.amount) || 0
    setForm((f) => ({ ...f, contributors: newContribs, my_share: String(myShare) }))
    const includedOthers = newContribs.filter((c, i) => c.included && i !== idx).length
    if (Math.abs(gap) > 0.01 && includedOthers > 0) {
      setRedistModal({ changedIdx: idx, gap })
    }
  }

  const handleSplitAmongOthers = () => {
    const { changedIdx, gap } = redistModal
    const others = form.contributors.filter((c, i) => c.included && i !== changedIdx)
    const perPerson = gap / others.length
    const newContribs = form.contributors.map((c, i) => {
      if (!c.included || i === changedIdx) return c
      return { ...c, amount: ((parseFloat(c.amount) || 0) + perPerson).toFixed(2) }
    })
    setForm((f) => ({ ...f, contributors: newContribs, my_share: newContribs[0]?.amount || '' }))
    setRedistModal(null)
  }

  const handleCoverMyself = () => {
    const { gap } = redistModal
    const newContribs = form.contributors.map((c, i) =>
      i === 0 ? { ...c, amount: ((parseFloat(c.amount) || 0) + gap).toFixed(2) } : c
    )
    setForm((f) => ({ ...f, contributors: newContribs, my_share: newContribs[0]?.amount || '' }))
    setRedistModal(null)
  }

  const includedContribs  = form.contributors.filter((c) => c.included)
  const contributorsSum   = includedContribs.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const totalAmount       = parseFloat(form.amount) || 0
  const allocationGap     = totalAmount > 0 ? totalAmount - contributorsSum : 0

  const handleSubmit = (e) => {
    e.preventDefault()
    const myShareVal = form.is_household
      ? (form.contributors.length > 0 ? parseFloat(form.contributors[0]?.amount) || null : form.my_share ? parseFloat(form.my_share) : null)
      : null
    const payload = {
      name: form.name, amount: parseFloat(form.amount),
      due_day: parseInt(form.due_day), due_type: form.due_type,
      account_id: form.account_id || null,
      category: form.category, is_household: form.is_household,
      my_share: myShareVal,
      notes: form.notes || null, expense_type: form.expense_type,
      contributors: form.is_household && form.contributors.length > 0
        ? form.contributors
            .filter((c) => c.included)
            .map((c, i) => ({ name: c.name || (i === 0 ? 'Me' : `Person ${i + 1}`), amount: parseFloat(c.amount) || 0 }))
        : null,
    }
    if (isInstallment) {
      payload.original_balance = form.original_balance ? parseFloat(form.original_balance) : null
      payload.remaining_balance = form.original_balance ? parseFloat(form.original_balance) : null
    }
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-secondary border border-accent-primary/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-text-primary font-semibold text-sm">{isEditing ? 'Edit Expense' : 'New Expense'}</p>
        <button type="button" onClick={onCancel} className="p-1 text-text-muted"><X size={16}/></button>
      </div>

      {/* Type toggle */}
      <div className="flex gap-2">
        {[{ key: 'recurring', label: 'Recurring' }, { key: 'installment', label: 'Installment' }].map(({ key, label }) => (
          <button key={key} type="button" onClick={() => set('expense_type', key)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              form.expense_type === key ? 'bg-accent-primary text-white border-accent-primary' : 'text-text-muted border-border-color'
            }`}>{label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-text-muted mb-1 block">Name</label>
          <input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Rent, Car payment…" required />
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">{isInstallment ? 'Monthly Payment ($)' : 'Amount ($)'}</label>
          <input type="number" step="0.01" min="0" className={inp} value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" required />
        </div>
        {isInstallment && (
          <div>
            <label className="text-xs text-text-muted mb-1 block">Total Owed ($)</label>
            <input type="number" step="0.01" min="0" className={inp} value={form.original_balance} onChange={(e) => set('original_balance', e.target.value)} placeholder="Total owed" required={isInstallment} />
          </div>
        )}
        <div>
          <label className="text-xs text-text-muted mb-1 block">Category</label>
          <select className={inp} value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        {!isInstallment && (
          <div>
            <label className="text-xs text-text-muted mb-1 block">Frequency</label>
            <select className={inp} value={form.due_type} onChange={(e) => set('due_type', e.target.value)}>
              {DUE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-text-muted mb-1 block">Due Day</label>
          <input type="number" min="1" max="31" className={inp} value={form.due_day} onChange={(e) => set('due_day', e.target.value)} required />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-text-muted mb-1 block">Paid From (optional)</label>
          <select className={inp} value={form.account_id} onChange={(e) => set('account_id', e.target.value)}>
            <option value="">No account</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="col-span-2 flex items-center gap-2.5">
          <button type="button" onClick={handleHouseholdToggle}
            className={`w-9 h-5 rounded-full transition-colors shrink-0 ${form.is_household ? 'bg-accent-primary' : 'bg-bg-primary border border-border-color'}`}>
            <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform mx-0.5 ${form.is_household ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <label className="text-text-secondary text-sm cursor-pointer" onClick={handleHouseholdToggle}>Household expense</label>
        </div>

        {/* Contributors section */}
        {form.is_household && (
          <div className="col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-text-muted">Contributors</label>
              <button type="button" onClick={splitEvenly}
                className="text-xs text-accent-primary hover:text-accent-primary/70 transition-colors">
                Split evenly
              </button>
            </div>

            {form.contributors.map((contributor, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <button type="button" onClick={() => idx !== 0 && toggleContributor(idx)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    contributor.included
                      ? 'bg-accent-primary border-accent-primary'
                      : 'border-border-color bg-bg-primary'
                  } ${idx === 0 ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}>
                  {contributor.included && <Check size={11} className="text-white" strokeWidth={3}/>}
                </button>
                <div className={`flex-1 bg-bg-tertiary border border-border-color rounded-xl px-3 py-2 text-sm truncate ${contributor.included ? 'text-text-primary' : 'text-text-muted'}`}>
                  {contributor.name || 'Me'}
                </div>
                <input
                  type="number" step="0.01" min="0"
                  disabled={!contributor.included}
                  className="w-24 bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-colors disabled:opacity-40"
                  value={contributor.amount}
                  onChange={(e) => updateContributorAmount(idx, e.target.value)}
                  placeholder="0.00"
                />
              </div>
            ))}

            {/* Allocation status */}
            {totalAmount > 0 && (
              <div className={`flex items-center justify-between text-xs px-0.5 ${Math.abs(allocationGap) > 0.01 ? 'text-accent-danger' : 'text-green-400'}`}>
                <span>Allocated: {formatCurrency(contributorsSum)}</span>
                <span>{Math.abs(allocationGap) > 0.01 ? `${allocationGap > 0 ? '+' : ''}${formatCurrency(allocationGap)} remaining` : '✓ Balanced'}</span>
              </div>
            )}

            <p className="text-text-muted text-xs">Check/uncheck to include members in this expense.</p>

            {/* Redistribution prompt */}
            {redistModal && (
              <div className="bg-bg-primary border border-accent-primary/20 rounded-xl p-3 space-y-2">
                <p className="text-text-primary text-xs font-semibold">
                  {redistModal.gap > 0 ? 'Shortfall' : 'Overage'}: {formatCurrency(Math.abs(redistModal.gap))}
                </p>
                <p className="text-text-muted text-xs">
                  {redistModal.gap > 0
                    ? `There are ${formatCurrency(redistModal.gap)} unallocated. How would you like to cover it?`
                    : `The contributions exceed the total by ${formatCurrency(Math.abs(redistModal.gap))}. How would you like to adjust?`}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleSplitAmongOthers}
                    className="flex-1 py-1.5 rounded-lg text-xs bg-accent-primary text-white font-semibold">
                    Split among others
                  </button>
                  {redistModal.changedIdx !== 0 && (
                    <button type="button" onClick={handleCoverMyself}
                      className="flex-1 py-1.5 rounded-lg text-xs border border-border-color text-text-primary font-semibold">
                      I'll cover it
                    </button>
                  )}
                  <button type="button" onClick={() => setRedistModal(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-text-muted border border-border-color">
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex-1 bg-accent-primary text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : isEditing ? 'Update' : 'Add Expense'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-text-muted text-sm border border-border-color rounded-xl">Cancel</button>
      </div>
    </form>
  )
}

// ─── Expense Row ──────────────────────────────────────────────────────────────
function ExpenseRow({ expense, accounts, memberCount, onEdit, onToggle, onDelete, onMarkPaid, onUnmarkPaid, onMarkInstallment }) {
  const cat        = CAT[expense.category] || CAT.other
  const CatIcon    = cat.Icon
  const inactive   = expense.is_active === false || expense.is_active === 0
  const isInstall  = expense.expense_type === 'installment'
  const paidCycle  = !isInstall && isPaidThisCycle(expense)

  const paymentsLeft = isInstall && (expense.remaining_balance || 0) > 0 && expense.amount > 0
    ? Math.ceil(expense.remaining_balance / expense.amount) : 0

  const paidPct = isInstall && expense.original_balance > 0
    ? Math.min(100, Math.round((1 - (expense.remaining_balance || 0) / expense.original_balance) * 100)) : 0

  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 border-b border-border-color last:border-0 transition-opacity ${inactive ? 'opacity-40' : ''}`}>
      <div className="p-1.5 rounded-lg bg-bg-tertiary shrink-0 mt-0.5">
        <CatIcon size={13} className={inactive ? 'text-text-muted' : cat.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-medium ${inactive ? 'text-text-muted line-through' : 'text-text-primary'}`}>{expense.name}</p>
          {isInstall && <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded px-1 py-0.5">Loan</span>}
          {(expense.is_household === true || expense.is_household === 1) && <span className="text-[10px] bg-accent-primary/10 text-accent-primary border border-accent-primary/20 rounded px-1 py-0.5">HH</span>}
          {paidCycle && <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 rounded px-1 py-0.5 font-semibold">✓ Paid</span>}
        </div>
        {isInstall ? (
          <>
            <div className="h-1 rounded-full bg-bg-tertiary mt-1.5 overflow-hidden w-full max-w-[160px]">
              <div className="h-full rounded-full bg-accent-secondary" style={{ width: `${paidPct}%` }} />
            </div>
            <p className="text-text-muted text-xs mt-1">{formatCurrency(expense.remaining_balance || 0)} left · {paymentsLeft}mo</p>
          </>
        ) : (
          <>
            <p className="text-text-muted text-xs mt-0.5">{expense.due_type === 'monthly' ? `${ordinal(expense.due_day)} of month` : 'Every 2 weeks'}</p>
            {(expense.is_household === true || expense.is_household === 1) && (
              <p className="text-accent-primary text-xs mt-0.5 font-medium">
                My share: {formatCurrency((expense.amount || 0) / memberCount)}
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <p className={`font-mono font-bold text-sm ${inactive ? 'text-text-muted' : paidCycle ? 'text-green-400' : 'text-accent-danger'}`}>
          {formatCurrency(expense.amount)}{isInstall ? '/mo' : ''}
        </p>
        <div className="flex items-center gap-1">
          {isInstall && !inactive && (
            <button onClick={() => onMarkInstallment(expense.id)}
              className="px-1.5 py-0.5 rounded text-[10px] text-accent-secondary bg-accent-secondary/10 border border-accent-secondary/20 font-semibold">Paid</button>
          )}
          {!isInstall && !inactive && !paidCycle && (
            <button onClick={() => onMarkPaid(expense.id)}
              className="px-1.5 py-0.5 rounded text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 font-semibold">Paid</button>
          )}
          {!isInstall && !inactive && paidCycle && (
            <button onClick={() => onUnmarkPaid(expense.id)}
              className="px-1.5 py-0.5 rounded text-[10px] text-text-muted bg-bg-tertiary border border-border-color">Undo</button>
          )}
          <button onClick={() => onEdit(expense)} className="p-1 text-text-muted hover:text-text-primary"><Pencil size={12}/></button>
          <button onClick={() => onDelete(expense.id)} className="p-1 text-text-muted hover:text-accent-danger"><Trash2 size={12}/></button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Expenses() {
  const { expenses, fetch, create, update, toggle, remove, markPaid, unmarkPaid, markInstallmentPayment } = useExpenseStore()
  const { accounts, fetch: fetchAccounts } = useAccountStore()
  const { contributors: householdMembers, fetch: fetchHousehold } = useHouseholdStore()
  const [filter, setFilter]               = useState('all')
  const [showForm, setShowForm]           = useState(false)
  const [editing, setEditing]             = useState(null)
  const [saving, setSaving]               = useState(false)

  useEffect(() => { fetch(); fetchAccounts(); fetchHousehold() }, [fetch, fetchAccounts, fetchHousehold])

  const activeExpenses = expenses.filter((e) => !(e.expense_type === 'installment' && e.completed_at))
  const filtered = activeExpenses.filter((e) => {
    if (filter === 'personal')  return e.is_household !== true && e.is_household !== 1
    if (filter === 'household') return e.is_household === true || e.is_household === 1
    return true
  })

  const activeOnly     = activeExpenses.filter((e) => e.is_active !== false && e.is_active !== 0)
  const personalTotal  = activeOnly.filter((e) => e.is_household !== true && e.is_household !== 1).reduce((s, e) => s + (e.amount || 0), 0)
  const householdExpenses = activeOnly.filter((e) => e.is_household === true || e.is_household === 1)
  const householdTotal = householdExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const memberCount    = householdMembers.length + 1  // +1 for Me
  const myShareTotal   = memberCount > 1 ? householdTotal / memberCount : householdTotal

  const handleCreate = async (payload) => {
    setSaving(true)
    try { await create(payload); setShowForm(false); toast.success('Expense added'); logEvent('expense_created', payload.name, payload.amount) }
    finally { setSaving(false) }
  }
  const handleUpdate = async (payload) => {
    setSaving(true)
    try { await update(editing.id, payload); setEditing(null); toast.success('Expense updated') }
    finally { setSaving(false) }
  }
  const handleDelete = async (id) => { await remove(id); toast.success('Expense removed') }
  const handleMarkPaid = async (id) => { await markPaid(id); toast.success('Marked as paid') }
  const handleUnmarkPaid = async (id) => { await unmarkPaid(id); toast.success('Unmarked') }
  const handleMarkInstallment = async (id) => {
    const data = await markInstallmentPayment(id)
    if (data?.completed_at) toast.success('Loan paid off! 🎉')
    else toast.success('Payment logged')
  }

  const completedInstallments = expenses.filter((e) => e.expense_type === 'installment' && e.completed_at)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-text-primary">Expenses</h2>
          <p className="text-text-muted text-xs mt-0.5">Fixed recurring expenses</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null) }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-accent-primary border border-accent-primary/30 rounded-xl hover:bg-accent-primary/10 transition-colors">
          <Plus size={14}/> Add
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-3.5">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Personal</p>
          <p className="text-2xl font-bold font-display text-accent-danger">{formatCurrency(personalTotal)}</p>
        </div>
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-3.5">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Household</p>
          <p className="text-2xl font-bold font-display text-accent-primary">{formatCurrency(myShareTotal)}</p>
          <p className="text-accent-primary/80 text-xs font-medium mt-0.5">of {formatCurrency(householdTotal)} total</p>
        </div>
      </div>

      {/* Add form */}
      {(showForm || editing) && (
        <ExpenseForm
          initial={editing ? toForm(editing) : undefined}
          accounts={accounts}
          householdMembers={householdMembers}
          onSave={editing ? handleUpdate : handleCreate}
          onCancel={() => { setShowForm(false); setEditing(null) }}
          saving={saving}
          isEditing={!!editing}
        />
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-bg-secondary border border-border-color rounded-xl p-1 w-fit">
        {[{ key: 'all', label: `All (${activeExpenses.length})` },
          { key: 'personal', label: 'Personal' },
          { key: 'household', label: 'Household' }].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === key ? 'bg-accent-primary text-white' : 'text-text-muted'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Expense list */}
      {filtered.length === 0 ? (
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-10 text-center">
          <DollarSign size={28} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-primary font-semibold mb-1">No expenses yet</p>
          <p className="text-text-muted text-sm">Add your recurring bills.</p>
        </div>
      ) : (
        <div className="bg-bg-secondary border border-border-color rounded-2xl overflow-hidden">
          {filtered.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              accounts={accounts}
              memberCount={memberCount}
              onEdit={(e) => { setEditing(e); setShowForm(false) }}
              onToggle={toggle}
              onDelete={handleDelete}
              onMarkPaid={handleMarkPaid}
              onUnmarkPaid={handleUnmarkPaid}
              onMarkInstallment={handleMarkInstallment}
            />
          ))}
        </div>
      )}

      {/* Completed installments */}
      {completedInstallments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-accent-secondary" />
            <h3 className="text-text-primary font-semibold text-sm">Paid Off</h3>
          </div>
          <div className="bg-bg-secondary border border-border-color rounded-2xl overflow-hidden">
            {completedInstallments.map((e) => {
              const cat = CAT[e.category] || CAT.other; const CatIcon = cat.Icon
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 border-b border-border-color last:border-0 opacity-60">
                  <div className="p-1.5 rounded-lg bg-bg-tertiary shrink-0"><CatIcon size={13} className="text-text-muted"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-text-muted text-sm line-through">{e.name}</p>
                      <CheckCircle size={11} className="text-accent-secondary"/>
                    </div>
                    <p className="text-text-muted text-xs">Paid off {e.completed_at ? new Date(e.completed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-muted text-xs font-mono">{formatCurrency(e.amount)}/mo freed</p>
                    <button onClick={() => handleDelete(e.id)} className="text-text-muted hover:text-accent-danger"><Trash2 size={11}/></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
