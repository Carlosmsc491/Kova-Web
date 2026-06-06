import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, DollarSign, CalendarClock, CreditCard,
  Clock, ChevronRight, Target, ArrowRight,
} from 'lucide-react'
import { useExpenseStore }  from '../stores/useExpenseStore'
import { useIncomeStore }   from '../stores/useIncomeStore'
import { useCreditStore }   from '../stores/useCreditStore'
import { useGoalsStore }    from '../stores/useGoalsStore'
import { useAccountStore }  from '../stores/useAccountStore'
import { formatCurrency, formatDate, formatPercent } from '../lib/formatters'
import { getNextPaycheckDate, daysUntil }            from '../lib/dateUtils'
import { calculateTrulyAvailable, buildPaymentCalendar } from '../lib/budgetEngine'

// ─── count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0)
  const frameRef = useRef(null)
  useEffect(() => {
    if (target == null) return
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) frameRef.current = requestAnimationFrame(tick)
      else setValue(target)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])
  return value
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
function todayLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, rawValue, icon: Icon, accent, sub, animate }) {
  const animated = useCountUp(animate && rawValue != null ? rawValue : null)
  const display  = animate && rawValue != null ? formatCurrency(animated) : value
  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-text-muted text-xs uppercase tracking-wider font-medium">{label}</span>
        <Icon size={16} className={accent} />
      </div>
      <div className={`text-2xl font-bold font-display ${accent}`}>{display}</div>
      {sub && <p className="text-text-muted text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ─── Payment Calendar ─────────────────────────────────────────────────────────
function PaymentCalendar({ events }) {
  if (!events?.length) return null
  const grouped = {}
  events.forEach((e) => { if (!grouped[e.date]) grouped[e.date] = []; grouped[e.date].push(e) })
  const dates = Object.keys(grouped).sort()
  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-text-primary font-semibold text-sm">Next 14 Days</p>
        <span className="text-text-muted text-xs">{events.length} event{events.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {dates.map((date) => {
          const d = new Date(date + 'T00:00:00')
          const dayEvents = grouped[date]
          const hasIncome = dayEvents.some((e) => e.type === 'income')
          return (
            <div key={date} className={`flex-none rounded-xl p-3 min-w-[100px] border ${
              hasIncome ? 'border-accent-secondary/30 bg-accent-secondary/5' : 'border-border-color bg-bg-tertiary'
            }`}>
              <p className="text-text-secondary text-xs font-medium">
                {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <p className="text-text-muted text-xs mb-2">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              {dayEvents.map((e, i) => (
                <div key={i}>
                  <p className={`text-xs font-mono font-bold ${e.type === 'income' ? 'text-accent-secondary' : 'text-accent-danger'}`}>
                    {e.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(e.amount))}
                  </p>
                  <p className="text-text-muted text-xs leading-tight truncate">{e.name}</p>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Goals Widget ─────────────────────────────────────────────────────────────
function GoalsWidget({ goals }) {
  const navigate = useNavigate()
  if (!goals?.length) return null
  const top3 = goals.slice(0, 3)
  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-text-primary font-semibold text-sm flex items-center gap-1.5">
          <Target size={15} className="text-accent-primary" /> Goals
        </p>
        <button onClick={() => navigate('/goals')} className="text-text-muted text-xs flex items-center gap-1 hover:text-accent-primary transition-colors">
          View all <ArrowRight size={11} />
        </button>
      </div>
      <div className="space-y-3">
        {top3.map((g) => {
          const pct = g.target_amount > 0 ? Math.min(100, ((g.current_amount ?? 0) / g.target_amount) * 100) : 0
          return (
            <div key={g.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-text-secondary text-xs font-medium truncate pr-2">{g.name}</span>
                <span className="text-text-muted text-xs shrink-0">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div className="h-full bg-accent-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-text-muted text-xs mt-0.5">{formatCurrency(g.current_amount ?? 0)} of {formatCurrency(g.target_amount)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Quick Actions ────────────────────────────────────────────────────────────
function QuickActions() {
  const navigate = useNavigate()
  const actions = [
    { label: 'Log Expenses',  path: '/expenses', color: 'text-accent-danger' },
    { label: 'Log Job 2 Day', path: '/income',   color: 'text-accent-warning' },
    { label: 'Pay Card',      path: '/credit',   color: 'text-accent-primary' },
    { label: 'Fund Goal',     path: '/goals',    color: 'text-accent-secondary' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((a) => (
        <button
          key={a.path}
          onClick={() => navigate(a.path)}
          className="bg-bg-secondary border border-border-color rounded-xl p-3.5 text-left hover:border-accent-primary/30 active:scale-95 transition-all"
        >
          <p className={`text-xs font-semibold ${a.color}`}>{a.label}</p>
          <ChevronRight size={13} className="text-text-muted mt-0.5" />
        </button>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { expenses, fetch: fetchExpenses }     = useExpenseStore()
  const { sources, job2Days, fetchSources, fetchJob2Days } = useIncomeStore()
  const { utilization, fetch: fetchCredit }    = useCreditStore()
  const { goals, fetch: fetchGoals }           = useGoalsStore()
  const { accounts, fetch: fetchAccounts }     = useAccountStore()

  useEffect(() => {
    fetchExpenses()
    fetchSources()
    fetchCredit()
    fetchGoals()
    fetchAccounts()
  }, [fetchExpenses, fetchSources, fetchCredit, fetchGoals, fetchAccounts])

  const job1       = sources.find((s) => s.type === 'biweekly')
  const job2       = sources.find((s) => s.type === 'variable_daily')
  const job2Pending = job2Days.filter((d) => !d.paid)
  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance ?? 0), 0)

  useEffect(() => {
    if (job2?.id) fetchJob2Days(job2.id)
  }, [job2?.id, fetchJob2Days])

  const activeExpenses = expenses.filter((e) => e.is_active !== false && e.is_active !== 0)
  const budgetData = calculateTrulyAvailable({
    currentBalance: totalBalance,
    expenses: activeExpenses,
    job1Source: job1,
  })

  const calendarEvents = buildPaymentCalendar({
    expenses: activeExpenses,
    job1Source: job1,
  })

  // Next paycheck
  const nextPayDate  = job1?.last_paycheck_date ? getNextPaycheckDate(job1.last_paycheck_date) : null
  const nextPayDays  = nextPayDate ? daysUntil(nextPayDate) : null
  const daysLabel    = nextPayDays === 0 ? 'Today!' : nextPayDays === 1 ? 'Tomorrow' : nextPayDays != null ? `${nextPayDays}d away` : '—'

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold font-display text-text-primary">
          {greeting()} 👋
        </h2>
        <p className="text-text-muted text-xs mt-0.5">{todayLabel()}</p>
      </div>

      {/* Truly Available hero */}
      <div
        className="bg-gradient-to-br from-accent-primary/20 to-purple-900/10 border border-accent-primary/30 rounded-2xl p-5 cursor-pointer active:scale-[0.99] transition-transform"
        onClick={() => navigate('/expenses')}
      >
        <p className="text-text-muted text-xs uppercase tracking-wider font-medium mb-1">Truly Available</p>
        <p className="text-4xl font-bold font-display text-accent-primary">
          {formatCurrency(budgetData.truly_available)}
        </p>
        <p className="text-text-muted text-xs mt-1.5">
          Safety floor: {formatCurrency(budgetData.safety_floor)} · Balance: {formatCurrency(totalBalance)}
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="text-text-muted text-xs uppercase tracking-wider font-medium">Next Check</span>
            <CalendarClock size={15} className="text-accent-primary" />
          </div>
          <div className="text-xl font-bold font-display text-accent-primary">
            {job1 ? formatCurrency(job1.amount_per_period) : '—'}
          </div>
          <p className="text-text-muted text-xs mt-1">{nextPayDate ? formatDate(nextPayDate) : 'Add Job 1'}</p>
          <p className="text-text-muted text-xs">{daysLabel}</p>
          {job2Pending.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border-color flex items-center justify-between">
              <span className="text-text-muted text-xs flex items-center gap-1"><Clock size={10}/> Job 2</span>
              <span className="text-accent-warning text-xs font-mono font-bold">
                +{formatCurrency(job2Pending.reduce((s,d)=>s+(d.day_rate||110),0))}
              </span>
            </div>
          )}
        </div>

        <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="text-text-muted text-xs uppercase tracking-wider font-medium">Credit</span>
            <CreditCard size={15} className={
              !utilization ? 'text-accent-primary'
              : utilization.total_utilization_pct >= 50 ? 'text-accent-danger'
              : utilization.total_utilization_pct >= 30 ? 'text-accent-warning'
              : 'text-accent-secondary'
            } />
          </div>
          <div className={`text-xl font-bold font-display ${
            !utilization ? 'text-accent-primary'
            : utilization.total_utilization_pct >= 50 ? 'text-accent-danger'
            : utilization.total_utilization_pct >= 30 ? 'text-accent-warning'
            : 'text-accent-secondary'
          }`}>
            {utilization ? formatPercent(utilization.total_utilization_pct) : '—'}
          </div>
          <p className="text-text-muted text-xs mt-1">
            {utilization
              ? `${formatCurrency(utilization.total_balance)} owed`
              : 'Add cards'}
          </p>
          {utilization?.cards?.length > 0 && (
            <p className="text-text-muted text-xs">{utilization.cards.length} card{utilization.cards.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* Monthly expenses summary */}
      <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Monthly Fixed Expenses</p>
            <p className="text-2xl font-bold font-display text-accent-danger">
              {formatCurrency(activeExpenses.reduce((s, e) => s + (e.amount || 0), 0))}
            </p>
          </div>
          <button onClick={() => navigate('/expenses')} className="text-text-muted hover:text-accent-primary transition-colors p-2">
            <ChevronRight size={18} />
          </button>
        </div>
        <p className="text-text-muted text-xs mt-0.5">{activeExpenses.length} active expenses</p>
      </div>

      {/* Payment Calendar */}
      {calendarEvents.length > 0 && <PaymentCalendar events={calendarEvents} />}

      {/* Goals widget */}
      {goals.length > 0 && <GoalsWidget goals={goals} />}

      {/* Quick actions */}
      <div>
        <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Quick Actions</p>
        <QuickActions />
      </div>
    </div>
  )
}
