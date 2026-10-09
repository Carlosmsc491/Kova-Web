import { useState, useEffect } from 'react'
import { Briefcase, Plus, Calendar, Pencil, Check } from 'lucide-react'
import { useIncomeStore }  from '../stores/useIncomeStore'
import { useAccountStore } from '../stores/useAccountStore'
import { formatCurrency, formatDate } from '../lib/formatters'
import { toast }   from '../stores/useToastStore'
import { getNextPaycheckDates, daysUntil, toISO } from '../lib/dateUtils'

// ─── Shared form primitives ───────────────────────────────────────────────────
const inp = 'w-full bg-bg-tertiary border border-border-color rounded-xl px-3 py-2.5 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors'

function Field({ label, children }) {
  return <div><label className="block text-text-muted text-xs uppercase tracking-wider mb-1.5">{label}</label>{children}</div>
}

// ─── Job form ─────────────────────────────────────────────────────────────────
function JobForm({ initial, accounts, onSave, onCancel }) {
  const [f, setF] = useState({
    name:                  initial?.name                ?? 'Job 1',
    company_name:          initial?.company_name        ?? '',
    amount_per_period:     initial?.amount_per_period   ?? '',
    last_paycheck_date:    initial?.last_paycheck_date  ?? toISO(new Date()),
    destination_account_id: initial?.destination_account_id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await onSave({
        name: f.name, company_name: f.company_name, type: 'biweekly',
        amount_per_period: parseFloat(f.amount_per_period) || null,
        pay_day_of_week: 5, last_paycheck_date: f.last_paycheck_date || null,
        destination_account_id: f.destination_account_id ? f.destination_account_id : null,
      })
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t border-border-color mt-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Label"><input className={inp} value={f.name} onChange={set('name')} placeholder="Job 1" required /></Field>
        <Field label="Company"><input className={inp} value={f.company_name} onChange={set('company_name')} placeholder="Acme Corp" required /></Field>
        <Field label="Net per check ($)"><input type="number" step="0.01" min="0" className={inp} value={f.amount_per_period} onChange={set('amount_per_period')} placeholder="1500.00" required /></Field>
        <Field label="Last paycheck">
          <input type="date" className={inp} value={f.last_paycheck_date} onChange={set('last_paycheck_date')} />
        </Field>
        <div className="col-span-2">
          <Field label="Deposited to">
            <select className={inp} value={f.destination_account_id} onChange={set('destination_account_id')}>
              <option value="">Don't add automatically</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <p className="text-text-muted text-[11px] mt-1">On payday the check is added to this account automatically (you can undo it).</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex-1 bg-accent-primary text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
          <Check size={14} className="inline mr-1"/>{saving ? 'Saving…' : initial ? 'Save' : 'Add Job'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-text-muted bg-bg-tertiary rounded-xl">Cancel</button>}
      </div>
    </form>
  )
}

// ─── Paycheck Timeline ────────────────────────────────────────────────────────
function PaycheckTimeline({ job }) {
  if (!job) return <p className="text-center py-6 text-text-muted text-sm">Add your job to see upcoming paychecks.</p>
  const dates = getNextPaycheckDates(job.last_paycheck_date ?? toISO(new Date()), 6)
  return (
    <div className="space-y-2">
      {dates.map((iso, i) => {
        const days = daysUntil(iso)
        const isNext = i === 0
        return (
          <div key={iso} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
            isNext ? 'bg-accent-primary/10 border border-accent-primary/30' : 'bg-bg-tertiary'
          }`}>
            <div className="flex items-center gap-3">
              <Calendar size={14} className={isNext ? 'text-accent-primary' : 'text-text-muted'} />
              <div>
                <p className={`text-sm font-medium ${isNext ? 'text-accent-primary' : 'text-text-primary'}`}>
                  {formatDate(iso)}{isNext && <span className="ml-2 text-xs text-accent-primary/70">← next</span>}
                </p>
                <p className="text-text-muted text-xs">{days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `in ${days} days`}</p>
              </div>
            </div>
            <span className={`font-mono font-bold text-sm ${isNext ? 'text-accent-primary' : 'text-accent-secondary'}`}>
              {formatCurrency(job.amount_per_period)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Income() {
  const { fetchSources, createSource, updateSource, getJob1 } = useIncomeStore()
  const { accounts, fetch: fetchAccounts } = useAccountStore()
  const [editing, setEditing] = useState(false)

  const job = getJob1()

  useEffect(() => { fetchSources(); fetchAccounts() }, [fetchSources, fetchAccounts])

  const handleSave = async (payload) => {
    if (job) await updateSource(job.id, payload); else await createSource(payload)
    fetchSources(); setEditing(false); toast.success('Job saved')
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-display text-text-primary">Income</h2>
        <p className="text-text-muted text-xs mt-0.5">Your job and upcoming paychecks</p>
      </div>

      <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase size={16} className="text-accent-primary"/>
          <h3 className="text-text-primary font-semibold text-sm">Job — Biweekly</h3>
          {!job && !editing && (
            <button onClick={() => setEditing(true)} className="ml-auto flex items-center gap-1 text-xs text-accent-primary"><Plus size={12}/> Add</button>
          )}
        </div>
        {job && !editing && (
          <div className="flex items-center justify-between">
            <div><p className="text-text-primary font-semibold text-sm">{job.name}</p><p className="text-text-muted text-xs">{job.company_name}</p></div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-accent-secondary font-bold text-sm">{formatCurrency(job.amount_per_period)}/check</span>
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><Pencil size={13}/></button>
            </div>
          </div>
        )}
        {(!job || editing) && <JobForm initial={editing && job ? job : null} accounts={accounts} onSave={handleSave} onCancel={job ? () => setEditing(false) : null} />}
      </div>

      <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
        <h3 className="text-text-primary font-semibold text-sm mb-3 flex items-center gap-2">
          <Calendar size={15} className="text-accent-secondary"/> Paycheck Timeline
          <span className="ml-auto text-text-muted text-xs font-normal">Next 6</span>
        </h3>
        <PaycheckTimeline job={job} />
      </div>
    </div>
  )
}
