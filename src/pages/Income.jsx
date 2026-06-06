import { useState, useEffect, useCallback } from 'react'
import {
  Briefcase, Clock, Plus, ChevronLeft, ChevronRight,
  Calendar, CheckCircle2, Pencil, Check,
} from 'lucide-react'
import { useIncomeStore }  from '../stores/useIncomeStore'
import { useAccountStore } from '../stores/useAccountStore'
import { formatCurrency, formatDate } from '../lib/formatters'
import { toast }   from '../stores/useToastStore'
import { logEvent } from '../stores/useHistoryStore'
import {
  getNextPaycheckDates, daysUntil, buildMonthGrid,
  formatMonthLabel, isTypicalJob2Day, toISO,
} from '../lib/dateUtils'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ─── Shared form primitives ───────────────────────────────────────────────────
const inp = 'w-full bg-bg-tertiary border border-border-color rounded-xl px-3 py-2.5 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors'

function Field({ label, children }) {
  return <div><label className="block text-text-muted text-xs uppercase tracking-wider mb-1.5">{label}</label>{children}</div>
}

// ─── Job 1 form ───────────────────────────────────────────────────────────────
function Job1Form({ initial, accounts, onSave, onCancel }) {
  const [f, setF] = useState({
    name:                  initial?.name                ?? 'Job 1',
    company_name:          initial?.company_name        ?? '',
    amount_per_period:     initial?.amount_per_period   ?? '',
    last_paycheck_date:    initial?.last_paycheck_date  ?? '2025-05-08',
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
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex-1 bg-accent-primary text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
          <Check size={14} className="inline mr-1"/>{saving ? 'Saving…' : initial ? 'Save' : 'Add Job 1'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-text-muted bg-bg-tertiary rounded-xl">Cancel</button>}
      </div>
    </form>
  )
}

// ─── Job 2 form ───────────────────────────────────────────────────────────────
function Job2Form({ initial, accounts, onSave, onCancel }) {
  const [f, setF] = useState({
    name:         initial?.name         ?? 'Job 2',
    company_name: initial?.company_name ?? '',
    daily_rate:   initial?.daily_rate   ?? 110,
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await onSave({ name: f.name, company_name: f.company_name, type: 'variable_daily', daily_rate: parseFloat(f.daily_rate) || 110 })
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t border-border-color mt-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Label"><input className={inp} value={f.name} onChange={set('name')} placeholder="Job 2" required /></Field>
        <Field label="Company"><input className={inp} value={f.company_name} onChange={set('company_name')} placeholder="Company" required /></Field>
        <Field label="Rate/day ($)"><input type="number" step="0.01" min="0" className={inp} value={f.daily_rate} onChange={set('daily_rate')} /></Field>
        <Field label="= hrs × rate">
          <div className="h-10 flex items-center text-text-muted text-sm">5 hrs × ${(Number(f.daily_rate) / 5).toFixed(2)}/hr</div>
        </Field>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex-1 bg-accent-warning/80 text-bg-primary rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
          <Check size={14} className="inline mr-1"/>{saving ? 'Saving…' : initial ? 'Save' : 'Add Job 2'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-text-muted bg-bg-tertiary rounded-xl">Cancel</button>}
      </div>
    </form>
  )
}

// ─── Day Logger ───────────────────────────────────────────────────────────────
function DayLogger({ source, job2Days, onLog, onUnlog }) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const cells     = buildMonthGrid(year, month)
  const workedMap = new Map(
    job2Days
      .filter((d) => { const [y, m] = d.work_date.split('-').map(Number); return y === year && m === month + 1 })
      .map((d) => [d.work_date, d])
  )
  const pendingInMonth = job2Days.filter((d) => {
    const [y, m] = d.work_date.split('-').map(Number)
    return y === year && m === month + 1 && !d.paid
  })
  const goMonth = (delta) => { const d = new Date(year, month + delta, 1); setYear(d.getFullYear()); setMonth(d.getMonth()) }
  const todayStr = toISO(new Date())

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => goMonth(-1)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><ChevronLeft size={16}/></button>
        <span className="text-text-primary font-semibold text-sm">{formatMonthLabel(year, month)}</span>
        <button onClick={() => goMonth(1)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><ChevronRight size={16}/></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => <div key={d} className="text-center text-text-muted text-xs py-1 font-medium">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />
          const worked  = workedMap.get(cell.date)
          const typical = isTypicalJob2Day(cell.weekday)
          const isToday = cell.date === todayStr
          const isFuture = cell.date > todayStr

          let cls = 'relative w-full aspect-square flex items-center justify-center rounded-lg text-sm transition-all '
          if (worked) cls += worked.paid ? 'bg-accent-secondary/20 text-accent-secondary font-semibold cursor-pointer' : 'bg-accent-warning/25 text-accent-warning font-semibold cursor-pointer'
          else if (isFuture) cls += typical ? 'bg-bg-tertiary text-text-secondary hover:bg-accent-primary/15 hover:text-accent-primary cursor-pointer' : 'text-text-muted cursor-pointer'
          else cls += typical ? 'bg-bg-tertiary/60 text-text-muted cursor-pointer hover:bg-accent-primary/10' : 'text-text-muted cursor-pointer hover:bg-bg-tertiary'
          if (isToday) cls += ' ring-1 ring-accent-primary'

          const handleClick = () => {
            if (!source) return
            if (worked) { if (!worked.paid) onUnlog(worked.id) }
            else onLog({ income_source_id: source.id, work_date: cell.date, day_rate: source.daily_rate ?? 110 })
          }
          return (
            <button key={cell.date} onClick={handleClick} className={cls}>
              {cell.day}
              {typical && !worked && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-primary/40"/>}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between bg-bg-tertiary rounded-xl px-3 py-2.5">
        <span className="text-text-muted text-sm">{pendingInMonth.length} day{pendingInMonth.length !== 1 ? 's' : ''} unpaid</span>
        <span className="text-accent-warning font-mono font-bold text-sm">{formatCurrency(pendingInMonth.reduce((s, d) => s + (d.day_rate || 110), 0))}</span>
      </div>
    </div>
  )
}

// ─── Paycheck Timeline ────────────────────────────────────────────────────────
function PaycheckTimeline({ job1Source, job2Pending }) {
  if (!job1Source) return <p className="text-center py-6 text-text-muted text-sm">Add Job 1 to see upcoming paychecks.</p>
  const dates = getNextPaycheckDates(job1Source.last_paycheck_date ?? '2025-05-08', 6)
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
              {formatCurrency(job1Source.amount_per_period)}
            </span>
          </div>
        )
      })}
      {(job2Pending?.pending_amount ?? 0) > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-accent-warning/10 border border-accent-warning/25">
          <div className="flex items-center gap-3">
            <Clock size={14} className="text-accent-warning"/>
            <div>
              <p className="text-sm font-medium text-accent-warning">Job 2 — Pending</p>
              <p className="text-text-muted text-xs">{(job2Pending.days?.length ?? 0)} days unpaid</p>
            </div>
          </div>
          <span className="font-mono font-bold text-sm text-accent-warning">{formatCurrency(job2Pending.pending_amount)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Income() {
  const { sources, job2Days, fetchSources, fetchJob2Days, createSource, updateSource, logJob2Day, unlogJob2Day, markAllJob2Paid, getJob1, getJob2, getJob2Pending } = useIncomeStore()
  const { accounts, fetch: fetchAccounts } = useAccountStore()
  const [editJob1, setEditJob1] = useState(false)
  const [editJob2, setEditJob2] = useState(false)

  const job1 = getJob1()
  const job2 = getJob2()
  const job2Pending = getJob2Pending()

  const refresh = useCallback(() => {
    fetchSources(); fetchAccounts()
    if (job2?.id) fetchJob2Days(job2.id)
  }, [fetchSources, fetchAccounts, fetchJob2Days, job2?.id])

  useEffect(() => { refresh() }, [])  // eslint-disable-line
  useEffect(() => { if (job2?.id) fetchJob2Days(job2.id) }, [job2?.id, fetchJob2Days])

  const handleSaveJob1 = async (payload) => {
    if (job1) await updateSource(job1.id, payload); else await createSource(payload)
    fetchSources(); setEditJob1(false); toast.success('Job 1 saved')
  }
  const handleSaveJob2 = async (payload) => {
    if (job2) await updateSource(job2.id, payload); else await createSource(payload)
    setEditJob2(false); toast.success('Job 2 saved')
  }
  const handleLog   = async (payload) => { await logJob2Day(payload) }
  const handleUnlog = async (id) => { await unlogJob2Day(id) }
  const handleMarkPaid = async () => {
    await markAllJob2Paid(); toast.success('Job 2 earnings marked paid')
    logEvent('job2_paid', 'Job 2 earnings marked paid', job2Pending.pending_amount)
  }

  const totalPending   = job2Pending.pending_amount ?? 0
  const unpaidDaysCount = job2Pending.days?.length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-text-primary">Income</h2>
          <p className="text-text-muted text-xs mt-0.5">Sources and Job 2 day logger</p>
        </div>
        {totalPending > 0 && (
          <div className="text-right">
            <p className="text-text-muted text-xs uppercase tracking-wider">Pending</p>
            <p className="text-accent-warning font-mono font-bold">{formatCurrency(totalPending)}</p>
            <p className="text-text-muted text-xs">{unpaidDaysCount}d unpaid</p>
          </div>
        )}
      </div>

      {/* Job 1 */}
      <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase size={16} className="text-accent-primary"/>
          <h3 className="text-text-primary font-semibold text-sm">Job 1 — Biweekly</h3>
          {!job1 && !editJob1 && (
            <button onClick={() => setEditJob1(true)} className="ml-auto flex items-center gap-1 text-xs text-accent-primary"><Plus size={12}/> Add</button>
          )}
        </div>
        {job1 && !editJob1 && (
          <div className="flex items-center justify-between">
            <div><p className="text-text-primary font-semibold text-sm">{job1.name}</p><p className="text-text-muted text-xs">{job1.company_name}</p></div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-accent-secondary font-bold text-sm">{formatCurrency(job1.amount_per_period)}/check</span>
              <button onClick={() => setEditJob1(true)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><Pencil size={13}/></button>
            </div>
          </div>
        )}
        {(!job1 || editJob1) && <Job1Form initial={editJob1 && job1 ? job1 : null} accounts={accounts} onSave={handleSaveJob1} onCancel={job1 ? () => setEditJob1(false) : null} />}
      </div>

      {/* Job 2 */}
      <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} className="text-accent-warning"/>
          <h3 className="text-text-primary font-semibold text-sm">Job 2 — Variable Days</h3>
          {!job2 && !editJob2 && (
            <button onClick={() => setEditJob2(true)} className="ml-auto flex items-center gap-1 text-xs text-accent-primary"><Plus size={12}/> Add</button>
          )}
        </div>
        {job2 && !editJob2 && (
          <div className="flex items-center justify-between">
            <div><p className="text-text-primary font-semibold text-sm">{job2.name}</p><p className="text-text-muted text-xs">{job2.company_name}</p></div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-accent-warning font-bold text-sm">{formatCurrency(job2.daily_rate)}/day</span>
              <button onClick={() => setEditJob2(true)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><Pencil size={13}/></button>
            </div>
          </div>
        )}
        {(!job2 || editJob2) && <Job2Form initial={editJob2 && job2 ? job2 : null} accounts={accounts} onSave={handleSaveJob2} onCancel={job2 ? () => setEditJob2(false) : null} />}

        {job2 && !editJob2 && (
          <div className="mt-4 pt-4 border-t border-border-color">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-text-muted"/>
              <span className="text-text-secondary text-sm font-medium">Day Logger</span>
              <span className="ml-auto text-text-muted text-xs"><span className="text-accent-primary">●</span> = typical day</span>
            </div>
            <DayLogger source={job2} job2Days={job2Days} onLog={handleLog} onUnlog={handleUnlog} />
          </div>
        )}
      </div>

      {/* Pending Pay */}
      {totalPending > 0 && (
        <div className="bg-accent-warning/5 border border-accent-warning/30 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-accent-warning"/>
              <div><h3 className="text-text-primary font-semibold text-sm">Pending Job 2 Pay</h3>
                <p className="text-text-muted text-xs">{unpaidDaysCount} day{unpaidDaysCount !== 1 ? 's' : ''} unpaid</p>
              </div>
            </div>
            <p className="text-accent-warning font-mono font-bold text-xl">{formatCurrency(totalPending)}</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {job2Pending.days?.map((d) => (
              <span key={d.id} className="px-2 py-1 bg-accent-warning/10 border border-accent-warning/20 rounded-lg text-accent-warning text-xs font-mono">
                {formatDate(d.work_date)}
              </span>
            ))}
          </div>
          <button onClick={handleMarkPaid} className="flex items-center gap-2 px-4 py-2 bg-accent-secondary/15 border border-accent-secondary/30 text-accent-secondary rounded-xl text-sm font-semibold hover:bg-accent-secondary/25 transition-colors">
            <CheckCircle2 size={15}/> Mark All as Paid
          </button>
        </div>
      )}

      {/* Paycheck Timeline */}
      <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
        <h3 className="text-text-primary font-semibold text-sm mb-3 flex items-center gap-2">
          <Calendar size={15} className="text-accent-secondary"/> Paycheck Timeline
          <span className="ml-auto text-text-muted text-xs font-normal">Next 6</span>
        </h3>
        <PaycheckTimeline job1Source={job1} job2Pending={job2Pending} />
      </div>
    </div>
  )
}
