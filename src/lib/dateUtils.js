export function todayISO() {
  return toISO(new Date())
}

export function toISO(d) {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Paycheck dates (every 14 days after `lastISO`) up to and including `uptoISO`.
export function paycheckDatesThrough(lastISO, uptoISO) {
  const out = []
  if (!lastISO) return out
  const last = parseISO(lastISO)
  for (let n = 1; n < 100; n++) {
    const d = new Date(last)
    d.setDate(d.getDate() + 14 * n)
    const iso = toISO(d)
    if (iso > uptoISO) break
    out.push(iso)
  }
  return out
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

// ─── Due dates ────────────────────────────────────────────────────────────────
// A recurring item is { due_type, due_day, due_date, paid_through, last_paid_date }.
// Credit cards use the same shape as a monthly item (due_day = payment_due_date).
//
// paid_through is the due date of the latest occurrence that was paid. Paying
// covers one specific due date, not "this calendar month" — so paying Nov 1
// rent on Oct 30 hides the Nov 1 occurrence until Dec 1 comes around.

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / 86_400_000)

// The month's due date, clamped so a 31st due day lands on the 30th/28th.
export function monthlyDueDate(year, month, dueDay) {
  const last = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(dueDay || 1, last))
}

// paid_through, or the equivalent derived from the older last_paid_date field
// (which meant "paid sometime in this month/week").
export function effectivePaidThrough(item) {
  if (item.paid_through) return item.paid_through
  if (!item.last_paid_date) return null
  const paid = parseISO(item.last_paid_date)
  switch (item.due_type) {
    case 'one-time': return item.due_date || item.last_paid_date
    case 'biweekly': return item.last_paid_date
    case 'weekly':   return toISO(addDays(paid, (item.due_day ?? 1) - paid.getDay()))
    default:         return toISO(monthlyDueDate(paid.getFullYear(), paid.getMonth(), item.due_day))
  }
}

// First due date strictly after `iso`, or null if there is none.
export function nextOccurrenceAfter(item, iso) {
  const after = parseISO(iso)
  switch (item.due_type) {
    case 'one-time':
      return item.due_date && item.due_date > iso ? item.due_date : null
    case 'weekly': {
      const diff = ((item.due_day ?? 1) - after.getDay() + 7) % 7 || 7
      return toISO(addDays(after, diff))
    }
    case 'biweekly': {
      // Anchored on the last paid due date (next one is 14 days later), or on
      // the first due date if it was never paid (that date itself counts).
      const paid   = effectivePaidThrough(item)
      const anchor = paid || item.due_date
      if (!anchor) return null
      const base = parseISO(anchor)
      let k = paid ? 1 : 0
      const gap = daysBetween(base, after)
      if (gap >= 0) k = Math.max(k, Math.floor(gap / 14) + 1)
      return toISO(addDays(base, 14 * k))
    }
    default: { // monthly (and credit cards)
      let d = monthlyDueDate(after.getFullYear(), after.getMonth(), item.due_day)
      if (d <= after) d = monthlyDueDate(after.getFullYear(), after.getMonth() + 1, item.due_day)
      return toISO(d)
    }
  }
}

// The earliest due date not yet paid. Can be in the past (overdue).
export function firstUnpaidOccurrence(item, today = todayISO()) {
  const paid = effectivePaidThrough(item)
  if (paid) return nextOccurrenceAfter(item, paid)
  const t = parseISO(today)
  switch (item.due_type) {
    case 'one-time': return item.due_date || null
    case 'monthly':  return toISO(monthlyDueDate(t.getFullYear(), t.getMonth(), item.due_day))
    // Never paid: start from today rather than inventing past weeks.
    default:         return nextOccurrenceAfter(item, toISO(addDays(t, -1)))
  }
}

// Earliest due date that can still count as overdue: the current cycle only.
// Earlier missed dates are ignored — the app never tracked them before
// paid_through existed, so they'd surface bills the user already paid.
function overdueFloor(item, today) {
  const t = parseISO(today)
  switch (item.due_type) {
    case 'one-time': return null
    case 'weekly':   return toISO(addDays(t, -6))
    case 'biweekly': return toISO(addDays(t, -13))
    default:         return toISO(monthlyDueDate(t.getFullYear(), t.getMonth(), item.due_day))
  }
}

// Day the item was added (YYYY-MM-DD), from a Firestore Timestamp or Date.
function createdISO(item) {
  const ts = item.created_at
  const ms = ts instanceof Date ? ts.getTime() : ts?.toMillis?.() ?? (ts?.seconds != null ? ts.seconds * 1000 : null)
  return ms == null ? null : toISO(new Date(ms))
}

// Due dates from the first unpaid one through `endISO`. A missed one in the
// current cycle is returned as `overdue` (counted today).
export function upcomingOccurrences(item, today, endISO) {
  let d = firstUnpaidOccurrence(item, today)
  const floor   = overdueFloor(item, today)
  const created = createdISO(item)
  let overdue = null
  const dates = []
  for (let guard = 0; d && d <= endISO && guard < 400; guard++) {
    if (d >= today) dates.push(d)
    // Strictly after creation: an item added on its due day usually starts
    // with the next one (and the old form silently set the due day to today).
    else if ((!floor || d >= floor) && (!created || d > created)) overdue = d
    d = nextOccurrenceAfter(item, d)
  }
  return { overdue, dates }
}

// Single source of truth for "is this paid for now" — nothing is due today or
// overdue. Used by Expenses, Chat, Dashboard and CashFlow so they agree.
export function isPaidThisCycle(item, refDate = new Date()) {
  const paid = effectivePaidThrough(item)
  if (!paid) return false
  const next = nextOccurrenceAfter(item, paid)
  return next == null || next > toISO(refDate)
}
