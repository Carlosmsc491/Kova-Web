/**
 * Client-side budget engine — ports the Python logic from KOVA_ARCHITECTURE.md
 */
import { toISO, parseISO, getNextPaycheckDates } from './dateUtils'

/**
 * Calculate "Truly Available" money based on current balance, upcoming income,
 * and upcoming fixed expenses over a horizon window.
 */
export function calculateTrulyAvailable(params) {
  const {
    currentBalance = 0,
    expenses       = [],
    job1Source     = null,
    creditCards    = [],
    horizonDays    = 60,
  } = params

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build day-by-day timeline
  let runningBalance = currentBalance
  const timeline     = []

  // Precompute upcoming paycheck dates
  const paycheckDates = new Set(
    job1Source?.last_paycheck_date
      ? getNextPaycheckDates(job1Source.last_paycheck_date, 8)
      : []
  )

  for (let i = 0; i <= horizonDays; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dateStr  = toISO(date)
    const dom      = date.getDate()
    let dayDelta   = 0

    // Add Job 1 paycheck
    if (paycheckDates.has(dateStr) && job1Source?.amount_per_period) {
      dayDelta += job1Source.amount_per_period
    }

    // Subtract active monthly expenses
    expenses.forEach((e) => {
      if (e.is_active === false || e.is_active === 0) return
      if (e.due_type === 'monthly' && dom === (e.due_day || 1)) {
        dayDelta -= (e.amount || 0)
      }
      if (e.due_type === 'biweekly') {
        // Approximate: every 14 days from today if within window
        if (i % 14 === 0 && i > 0) dayDelta -= (e.amount || 0)
      }
    })

    runningBalance += dayDelta
    timeline.push({ date: dateStr, delta: dayDelta, running_balance: runningBalance })
  }

  const safetyFloor   = Math.min(...timeline.map((d) => d.running_balance), currentBalance)
  const trulyAvailable = Math.max(0, currentBalance - Math.max(0, currentBalance - safetyFloor))

  // Find next low point
  const minEntry = timeline.reduce(
    (a, b) => b.running_balance < a.running_balance ? b : a,
    timeline[0]
  )

  return {
    current_balance:  currentBalance,
    safety_floor:     safetyFloor,
    truly_available:  trulyAvailable,
    next_low_point:   minEntry,
    timeline,
  }
}

/**
 * Build 14-day payment calendar (upcoming expenses + income events).
 * paycheckDateList: pre-computed list of upcoming paycheck date strings (YYYY-MM-DD)
 */
export function buildPaymentCalendar(params) {
  const { expenses = [], job1Source = null, paycheckDateList = [], horizonDays = 14 } = params
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const events = []

  for (let i = 0; i <= horizonDays; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dateStr = toISO(date)
    const dom     = date.getDate()

    // Paycheck — use the pre-computed list passed in from the caller
    if (paycheckDateList.includes(dateStr) && job1Source?.amount_per_period) {
      events.push({
        date:   dateStr,
        name:   job1Source.name || 'Job 1 Paycheck',
        amount: Number(job1Source.amount_per_period),
        type:   'income',
      })
    }

    // Expenses
    expenses.forEach((e) => {
      if (e.is_active === false || e.is_active === 0) return
      if (e.due_type === 'monthly' && dom === (e.due_day || 1)) {
        events.push({ date: dateStr, name: e.name, amount: e.amount, type: 'expense' })
      }
    })
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}
