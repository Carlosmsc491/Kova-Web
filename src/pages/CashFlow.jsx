import { useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Landmark } from 'lucide-react'
import { useExpenseStore }    from '../stores/useExpenseStore'
import { useIncomeStore }     from '../stores/useIncomeStore'
import { useAccountStore }    from '../stores/useAccountStore'
import { useHouseholdStore }  from '../stores/useHouseholdStore'
import { formatCurrency }     from '../lib/formatters'
import { getNextPaycheckDates, toISO } from '../lib/dateUtils'

const HORIZON = 60

// ─── Build day-by-day projection ──────────────────────────────────────────────
function buildTimeline({ startBalance, effectiveExpenses, job1, paycheckDates }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = []
  let balance = startBalance

  for (let i = 0; i <= HORIZON; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dateStr = toISO(date)
    const dom     = date.getDate()
    const events  = []

    // Paychecks
    if (paycheckDates.includes(dateStr) && job1?.amount_per_period) {
      events.push({
        type: 'income',
        name: job1.name || 'Job 1 Paycheck',
        amount: Number(job1.amount_per_period),
      })
    }

    // Monthly expenses
    effectiveExpenses.forEach((e) => {
      if (e.due_type === 'monthly' && dom === (e.due_day || 1)) {
        events.push({
          type:         'expense',
          name:         e.name,
          amount:       e.amount || 0,
          category:     e.category,
          is_household: e.is_household === true || e.is_household === 1,
        })
      }
    })

    const dayIn  = events.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
    const dayOut = events.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    balance = Math.round((balance + dayIn - dayOut) * 100) / 100

    days.push({ dateStr, date, events, dayIn, dayOut, balance, isToday: i === 0 })
  }

  return days
}

// ─── Event row ─────────────────────────────────────────────────────────────────
function EventRow({ event }) {
  const isIncome = event.type === 'income'
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isIncome ? 'bg-accent-secondary' : 'bg-accent-danger'}`} />
        <span className="text-text-secondary text-sm truncate">
          {event.name}
          {event.is_household && <span className="text-text-muted text-xs ml-1">(my share)</span>}
        </span>
      </div>
      <span className={`font-mono text-sm font-semibold shrink-0 ml-2 ${isIncome ? 'text-accent-secondary' : 'text-accent-danger'}`}>
        {isIncome ? '+' : '−'}{formatCurrency(event.amount)}
      </span>
    </div>
  )
}

// ─── Day card ─────────────────────────────────────────────────────────────────
function DayCard({ day, startBalance, minBalance }) {
  const { date, events, dayIn, dayOut, balance, isToday } = day
  const hasIncome  = dayIn > 0
  const hasExpense = dayOut > 0
  const isLow      = balance === minBalance && !isToday && minBalance < startBalance * 0.3

  const borderColor = isToday
    ? 'border-accent-primary/40'
    : hasIncome && hasExpense ? 'border-accent-primary/20'
    : hasIncome  ? 'border-accent-secondary/30'
    : 'border-border-color'

  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className={`bg-bg-secondary border ${borderColor} rounded-2xl p-3.5`}>
      {/* Date header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isToday && (
            <span className="text-xs bg-accent-primary text-white font-semibold px-2 py-0.5 rounded-full">Today</span>
          )}
          <span className={`text-xs font-semibold ${isToday ? 'text-accent-primary' : 'text-text-muted'}`}>
            {isToday ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : dateLabel}
          </span>
        </div>
        {isLow && <AlertTriangle size={13} className="text-accent-warning" />}
      </div>

      {/* Events */}
      {events.length > 0 && (
        <div className="border-t border-border-color pt-2 mb-2">
          {events.map((e, i) => <EventRow key={i} event={e} />)}
        </div>
      )}

      {/* Running balance */}
      <div className={`flex items-center justify-between pt-1 ${events.length > 0 ? 'border-t border-border-color' : ''}`}>
        <span className="text-text-muted text-xs">{isToday ? 'Current balance' : 'Balance after'}</span>
        <span className={`font-mono text-sm font-bold ${balance >= 0 ? 'text-text-primary' : 'text-accent-danger'}`}>
          {formatCurrency(balance)}
        </span>
      </div>
    </div>
  )
}

// ─── Month separator ──────────────────────────────────────────────────────────
function MonthLabel({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-border-color" />
      <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-border-color" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CashFlow() {
  const { expenses, fetch: fetchExpenses }       = useExpenseStore()
  const { sources, fetchSources }                = useIncomeStore()
  const { accounts, fetch: fetchAccounts }       = useAccountStore()
  const { contributors, fetch: fetchHousehold }  = useHouseholdStore()

  useEffect(() => {
    fetchExpenses()
    fetchSources()
    fetchAccounts()
    fetchHousehold()
  }, [fetchExpenses, fetchSources, fetchAccounts, fetchHousehold])

  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance ?? 0), 0)
  const job1         = sources.find((s) => s.type === 'biweekly')
  const memberCount  = contributors.length + 1

  const activeExpenses = expenses.filter((e) => e.is_active !== false && e.is_active !== 0)
  const effectiveExpenses = activeExpenses.map((e) => {
    if ((e.is_household === true || e.is_household === 1) && memberCount > 1) {
      return { ...e, amount: (e.amount || 0) / memberCount }
    }
    return e
  })

  const paycheckDates = job1?.last_paycheck_date
    ? getNextPaycheckDates(job1.last_paycheck_date, 8)
    : []

  const timeline = buildTimeline({ startBalance: totalBalance, effectiveExpenses, job1, paycheckDates })

  // Summary stats
  const endBalance   = timeline[timeline.length - 1]?.balance ?? totalBalance
  const totalIn      = timeline.reduce((s, d) => s + d.dayIn, 0)
  const totalOut     = timeline.reduce((s, d) => s + d.dayOut, 0)
  const minBalance   = Math.min(...timeline.map((d) => d.balance))
  const minDay       = timeline.find((d) => d.balance === minBalance)

  // Only show days that have events OR today
  const eventDays = timeline.filter((d) => d.events.length > 0 || d.isToday)

  // Group by month for separators
  let lastMonth = -1

  const loading = accounts.length === 0 && expenses.length === 0

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-display text-text-primary">Cash Flow</h2>
        <p className="text-text-muted text-xs mt-0.5">Next {HORIZON} days · day by day</p>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-3.5">
          <p className="text-text-muted text-xs mb-1">Starting</p>
          <p className={`font-mono font-bold text-lg ${totalBalance >= 0 ? 'text-text-primary' : 'text-accent-danger'}`}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-3.5">
          <p className="text-text-muted text-xs mb-1">Projected End</p>
          <p className={`font-mono font-bold text-lg ${endBalance >= 0 ? 'text-accent-secondary' : 'text-accent-danger'}`}>
            {formatCurrency(endBalance)}
          </p>
        </div>
        <div className="bg-bg-secondary border border-accent-secondary/20 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-accent-secondary" />
            <p className="text-text-muted text-xs">Income in</p>
          </div>
          <p className="font-mono font-bold text-lg text-accent-secondary">+{formatCurrency(totalIn)}</p>
        </div>
        <div className="bg-bg-secondary border border-accent-danger/20 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={12} className="text-accent-danger" />
            <p className="text-text-muted text-xs">Expenses out</p>
          </div>
          <p className="font-mono font-bold text-lg text-accent-danger">−{formatCurrency(totalOut)}</p>
        </div>
      </div>

      {/* Low point warning */}
      {minBalance < totalBalance * 0.25 && minDay && (
        <div className="bg-accent-warning/10 border border-accent-warning/30 rounded-2xl p-3.5 flex items-start gap-3">
          <AlertTriangle size={16} className="text-accent-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-text-primary text-sm font-semibold">Low point warning</p>
            <p className="text-text-muted text-xs mt-0.5">
              Balance dips to <span className="font-mono font-semibold text-accent-danger">{formatCurrency(minBalance)}</span> on {minDay.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      {/* Day-by-day timeline */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {eventDays.map((day) => {
            const month = day.date.getMonth()
            const showLabel = month !== lastMonth
            lastMonth = month
            return (
              <div key={day.dateStr}>
                {showLabel && !day.isToday && (
                  <MonthLabel label={day.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} />
                )}
                <DayCard day={day} startBalance={totalBalance} minBalance={minBalance} />
              </div>
            )
          })}
        </div>
      )}

      {!loading && eventDays.length <= 1 && (
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-8 text-center">
          <Landmark size={28} className="text-text-muted mx-auto mb-2" />
          <p className="text-text-primary font-semibold text-sm mb-1">No upcoming events</p>
          <p className="text-text-muted text-xs">Add expenses with due dates and a biweekly income source to see your cash flow.</p>
        </div>
      )}
    </div>
  )
}
