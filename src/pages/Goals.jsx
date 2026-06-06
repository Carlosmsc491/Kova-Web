import { useState, useEffect } from 'react'
import { Target, Plus, Pencil, Trash2, CheckCircle, Lightbulb, X } from 'lucide-react'
import { useGoalsStore }   from '../stores/useGoalsStore'
import { useExpenseStore } from '../stores/useExpenseStore'
import { formatCurrency, formatDate } from '../lib/formatters'
import { toast }   from '../stores/useToastStore'
import { logEvent } from '../stores/useHistoryStore'

function estimatedCompletion(goal) {
  const remaining = (goal.target_amount ?? 0) - (goal.current_amount ?? 0)
  if (remaining <= 0 || !goal.monthly_contribution || goal.monthly_contribution <= 0) return null
  const months = Math.ceil(remaining / goal.monthly_contribution)
  const d = new Date(); d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const BLANK = { name: '', target_amount: '', current_amount: '', monthly_contribution: '', target_date: '', priority: '1' }

function toForm(g) {
  return {
    name: g.name, target_amount: String(g.target_amount ?? ''),
    current_amount: String(g.current_amount ?? ''), monthly_contribution: String(g.monthly_contribution ?? ''),
    target_date: g.target_date ?? '', priority: String(g.priority ?? 1),
  }
}

// ─── Contribution Modal ───────────────────────────────────────────────────────
function ContribModal({ goal, onAdd, onClose }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const remaining = goal.target_amount - (goal.current_amount || 0)

  const handleAdd = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setSaving(true)
    try { await onAdd(goal.id, amt); onClose() } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}/>
      <div className="relative z-10 w-full sm:max-w-sm bg-bg-secondary border border-border-color rounded-t-3xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-text-primary font-semibold">Fund: {goal.name}</p>
          <button onClick={onClose} className="p-1.5 text-text-muted"><X size={16}/></button>
        </div>
        <p className="text-text-muted text-xs mb-3">Remaining: {formatCurrency(remaining)}</p>
        {goal.monthly_contribution > 0 && (
          <button onClick={() => setAmount(String(goal.monthly_contribution))}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border-color text-sm text-text-secondary mb-3 hover:border-accent-primary/40 transition-colors">
            <span>Monthly contribution</span>
            <span className="font-mono font-bold">{formatCurrency(goal.monthly_contribution)}</span>
          </button>
        )}
        <div className="mb-4">
          <label className="text-xs text-text-muted mb-1 block">Amount ($)</label>
          <input type="number" step="0.01" min="0" className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <button onClick={handleAdd} disabled={saving || !parseFloat(amount)}
          className="w-full bg-accent-secondary text-bg-primary rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : `Add ${formatCurrency(parseFloat(amount) || 0)}`}
        </button>
      </div>
    </div>
  )
}

// ─── Goal Form ────────────────────────────────────────────────────────────────
function GoalForm({ initial, onSave, onCancel, saving, isEditing }) {
  const [form, setForm] = useState(initial || BLANK)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const inp = 'w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-colors'

  const months = form.target_amount && form.monthly_contribution
    ? Math.ceil((parseFloat(form.target_amount) - (parseFloat(form.current_amount) || 0)) / parseFloat(form.monthly_contribution)) : null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      name: form.name, target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      monthly_contribution: form.monthly_contribution ? parseFloat(form.monthly_contribution) : null,
      target_date: form.target_date || null, priority: parseInt(form.priority) || 1,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-secondary border border-accent-primary/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-text-primary font-semibold text-sm">{isEditing ? 'Edit Goal' : 'New Goal'}</p>
        <button type="button" onClick={onCancel} className="p-1 text-text-muted"><X size={16}/></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-text-muted mb-1 block">Goal Name</label>
          <input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Emergency Fund, New Car…" required />
        </div>
        <div><label className="text-xs text-text-muted mb-1 block">Target ($)</label><input type="number" step="0.01" min="0" className={inp} value={form.target_amount} onChange={(e) => set('target_amount', e.target.value)} placeholder="5000" required /></div>
        <div><label className="text-xs text-text-muted mb-1 block">Already Saved ($)</label><input type="number" step="0.01" min="0" className={inp} value={form.current_amount} onChange={(e) => set('current_amount', e.target.value)} placeholder="0" /></div>
        <div><label className="text-xs text-text-muted mb-1 block">Monthly ($)</label><input type="number" step="0.01" min="0" className={inp} value={form.monthly_contribution} onChange={(e) => set('monthly_contribution', e.target.value)} placeholder="200" /></div>
        <div><label className="text-xs text-text-muted mb-1 block">Priority</label>
          <select className={inp} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
            {[1,2,3,4,5].map((n) => <option key={n} value={n}>P{n}</option>)}
          </select>
        </div>
        <div className="col-span-2"><label className="text-xs text-text-muted mb-1 block">Target Date (optional)</label><input type="date" className={inp} value={form.target_date} onChange={(e) => set('target_date', e.target.value)} /></div>
      </div>
      {months != null && months > 0 && (
        <div className="bg-accent-primary/10 rounded-xl px-3 py-2 flex justify-between text-xs">
          <span className="text-text-secondary">Estimated completion</span>
          <span className="text-accent-primary font-medium">{months} month{months !== 1 ? 's' : ''}</span>
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex-1 bg-accent-primary text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : isEditing ? 'Update' : 'Create Goal'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-text-muted text-sm border border-border-color rounded-xl">Cancel</button>
      </div>
    </form>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ goal: g, onEdit, onDelete, onComplete, onContribute }) {
  const pct     = g.target_amount > 0 ? Math.min(100, ((g.current_amount ?? 0) / g.target_amount) * 100) : 0
  const remaining = Math.max(0, g.target_amount - (g.current_amount ?? 0))
  const estDate = estimatedCompletion(g)
  const barColor = pct >= 100 ? 'bg-accent-secondary' : pct >= 60 ? 'bg-accent-primary' : 'bg-accent-primary/70'

  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className="p-1.5 rounded-lg bg-accent-primary/10 shrink-0">
            <Target size={15} className="text-accent-primary"/>
          </div>
          <div className="min-w-0">
            <p className="text-text-primary font-semibold text-sm leading-tight">{g.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              g.priority === 1 ? 'text-accent-secondary bg-accent-secondary/10' : g.priority === 2 ? 'text-accent-primary bg-accent-primary/10' : 'text-text-muted bg-bg-tertiary'
            }`}>P{g.priority}</span>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0 ml-2">
          <button onClick={() => onEdit(g)} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"><Pencil size={12}/></button>
          <button onClick={() => onDelete(g.id)} className="p-1.5 text-text-muted hover:text-accent-danger rounded-lg hover:bg-bg-tertiary transition-colors"><Trash2 size={12}/></button>
        </div>
      </div>
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-xl font-bold font-mono text-text-primary">{formatCurrency(g.current_amount ?? 0)}</p>
          <p className="text-text-muted text-xs">of {formatCurrency(g.target_amount)}</p>
        </div>
        <div className="text-right">
          <p className="text-text-primary font-bold font-display text-lg">{pct.toFixed(0)}%</p>
          <p className="text-text-muted text-xs">complete</p>
        </div>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%`}}/>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mb-3">
        <div><span className="text-text-muted">Remaining: </span><span className="text-text-secondary font-mono">{formatCurrency(remaining)}</span></div>
        {g.monthly_contribution > 0 && <div><span className="text-text-muted">Monthly: </span><span className="text-text-secondary font-mono">{formatCurrency(g.monthly_contribution)}</span></div>}
        {estDate && <div><span className="text-text-muted">Est: </span><span className="text-accent-primary">{estDate}</span></div>}
        {g.target_date && <div><span className="text-text-muted">Target: </span><span className="text-text-secondary">{formatDate(g.target_date)}</span></div>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onContribute(g)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-accent-secondary border border-accent-secondary/30 rounded-xl hover:bg-accent-secondary/10 font-semibold transition-colors">
          + Add Funds
        </button>
        <button onClick={() => onComplete(g.id)} className="px-3 py-2 text-xs text-text-muted border border-border-color rounded-xl hover:text-accent-secondary hover:border-accent-secondary/50 transition-colors">
          <CheckCircle size={13}/>
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Goals() {
  const { goals, loading, fetch, create, update, addContribution, markComplete, remove } = useGoalsStore()
  const { expenses, fetch: fetchExpenses } = useExpenseStore()
  const [showForm,    setShowForm]    = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [contributing, setContrib]    = useState(null)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => { fetch(); fetchExpenses() }, [fetch, fetchExpenses])

  const totalExpenses  = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const hasEmergFund   = goals.some((g) => g.name.toLowerCase().includes('emergency'))

  const handleCreate = async (payload) => {
    setSaving(true); try { await create(payload); setShowForm(false); toast.success('Goal created') } finally { setSaving(false) }
  }
  const handleUpdate = async (payload) => {
    setSaving(true); try { await update(editing.id, payload); setEditing(null); toast.success('Goal updated') } finally { setSaving(false) }
  }
  const handleDelete   = async (id) => { await remove(id); toast.success('Goal deleted') }
  const handleComplete = async (id) => { await markComplete(id); toast.success('Goal completed! 🎉') }
  const handleContrib  = async (id, amount) => {
    const result = await addContribution(id, amount)
    toast.success(result?.is_completed ? 'Goal reached! 🎉' : `+${formatCurrency(amount)} added`)
    logEvent('goal_contribution', `Funded goal`, amount)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-text-primary">Goals</h2>
          <p className="text-text-muted text-xs mt-0.5">Savings goals & progress</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null) }}
          className="flex items-center gap-1.5 text-sm text-accent-primary border border-accent-primary/30 rounded-xl px-3 py-2 hover:bg-accent-primary/10 transition-colors">
          <Plus size={14}/> New Goal
        </button>
      </div>

      {/* Emergency fund suggestion */}
      {!hasEmergFund && !showForm && !editing && (
        <div className="border border-accent-warning/30 bg-accent-warning/5 rounded-2xl p-4 flex items-start gap-3">
          <Lightbulb size={18} className="text-accent-warning shrink-0 mt-0.5"/>
          <div className="flex-1">
            <p className="text-text-primary font-semibold text-sm mb-0.5">Suggested: Emergency Fund</p>
            <p className="text-text-muted text-xs">3 months of expenses = {totalExpenses > 0 ? formatCurrency(totalExpenses * 3) : '?'}</p>
          </div>
          {totalExpenses > 0 && (
            <button onClick={() => {
              setShowForm(true); setEditing(null)
            }} className="shrink-0 text-xs text-accent-warning border border-accent-warning/40 rounded-xl px-3 py-1.5 hover:bg-accent-warning/10 transition-colors">
              Create
            </button>
          )}
        </div>
      )}

      {/* Form */}
      {(showForm || editing) && (
        <GoalForm initial={editing ? toForm(editing) : undefined} onSave={editing ? handleUpdate : handleCreate}
          onCancel={() => { setShowForm(false); setEditing(null) }} saving={saving} isEditing={!!editing} />
      )}

      {/* Empty state */}
      {!loading && goals.length === 0 && !showForm && (
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-10 text-center">
          <Target size={32} className="text-text-muted mx-auto mb-3"/>
          <p className="text-text-primary font-semibold mb-1">No active goals</p>
          <p className="text-text-muted text-sm mb-4">Start tracking your financial milestones.</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 text-sm text-accent-primary border border-accent-primary/30 rounded-xl px-4 py-2 hover:bg-accent-primary/10 transition-colors">
            <Plus size={14}/> Add your first goal
          </button>
        </div>
      )}

      {/* Goal cards */}
      {goals.length > 0 && (
        <div className="space-y-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g}
              onEdit={(g) => { setEditing(g); setShowForm(false) }}
              onDelete={handleDelete}
              onComplete={handleComplete}
              onContribute={(g) => setContrib(g)}
            />
          ))}
        </div>
      )}

      {contributing && <ContribModal goal={contributing} onAdd={handleContrib} onClose={() => setContrib(null)} />}
    </div>
  )
}
