export function todayISO() {
  return toISO(new Date())
}

export function toISO(d) {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysUntil(isoDateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = parseISO(isoDateStr)
  return Math.round((target - today) / 86_400_000)
}

export function getNextPaycheckDates(lastPaycheckISO, count = 6) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const last = parseISO(lastPaycheckISO)
  const dates = []
  let n = 1
  // Roll forward past any cycles that have already happened, same as
  // getNextPaycheckDate — otherwise a stale last_paycheck_date shows past
  // dates as "upcoming".
  while (dates.length < count) {
    const c = new Date(last)
    c.setDate(c.getDate() + 14 * n)
    if (c >= today) dates.push(toISO(c))
    n++
  }
  return dates
}

export function getNextPaycheckDate(lastPaycheckISO) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const last = parseISO(lastPaycheckISO)
  let n = 1
  while (true) {
    const c = new Date(last)
    c.setDate(c.getDate() + 14 * n)
    if (c >= today) return toISO(c)
    n++
  }
}

// Single source of truth for "has this expense been paid for its current
// billing cycle" — used by Expenses, Chat, Dashboard, and CashFlow so the
// four pages never disagree on due_type-specific windows or timezone-safe
// date parsing again.
export function isPaidThisCycle(expense, refDate = new Date()) {
  if (!expense.last_paid_date) return false
  if (expense.due_type === 'one-time') return true // paid once = done forever
  const paid = parseISO(expense.last_paid_date)
  const now  = new Date(refDate)
  now.setHours(0, 0, 0, 0)
  const diffDays = Math.round((now - paid) / 86_400_000)
  if (expense.due_type === 'weekly')   return diffDays >= 0 && diffDays < 7
  if (expense.due_type === 'biweekly') return diffDays >= 0 && diffDays < 14
  return paid.getFullYear() === now.getFullYear() && paid.getMonth() === now.getMonth()
}
