import { toISO, upcomingOccurrences, paycheckDatesThrough } from './dateUtils'

export const HORIZON = 60
// Smallest extra card payment worth scheduling — avoids a trail of tiny payments.
const MIN_EXTRA_PAYMENT = 25

const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / 86_400_000)

const isHousehold = (e) => e.is_household === true || e.is_household === 1

// The user's part of a household bill. A saved custom split (contributors +
// my_share from the Expenses form) wins; otherwise it's an even split.
export function myShareOf(e, memberCount) {
  if (!isHousehold(e) || memberCount <= 1) return e.amount || 0
  if (Array.isArray(e.contributors) && e.contributors.length > 0 && e.my_share != null) return Number(e.my_share) || 0
  return (e.amount || 0) / memberCount
}

// ─── Day-by-day projection ────────────────────────────────────────────────────
// `cards` adds each card's minimum payment as a mandatory outflow on its due day.
// `extras` are planned extra card payments: [{ dateStr, cardId, name, amount }].
export function buildTimeline({ startBalance, effectiveExpenses, job1, cards = [], extras = [] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayStr = toISO(today)
  const endStr   = toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + HORIZON))

  // Expense occurrences, keyed by the day they land on. Each event carries the
  // due date it belongs to, so paying it covers exactly that occurrence. A
  // missed (overdue) one is counted today: if it was actually paid, recording
  // the payment removes it — erring this way keeps "safe to pay" from
  // overdrawing the account.
  const expenseEvents = new Map()
  const addEvent = (dateStr, ev) => {
    if (!expenseEvents.has(dateStr)) expenseEvents.set(dateStr, [])
    expenseEvents.get(dateStr).push(ev)
  }
  effectiveExpenses.forEach((e) => {
    // Installments stop once what's left on the loan is paid.
    let loanLeft = e.expense_type === 'installment' && e.remaining_balance != null ? e.remaining_balance : Infinity
    const { overdue, dates } = upcomingOccurrences(e, todayStr, endStr)
    const occ = [...(overdue ? [{ due: overdue, on: todayStr, overdue: true }] : []), ...dates.map((d) => ({ due: d, on: d }))]
    occ.forEach(({ due, on, overdue: isOverdue }) => {
      const amount = Math.min(e.amount || 0, loanLeft)
      if (amount <= 0) return
      loanLeft -= amount
      addEvent(on, {
        type: 'expense', name: e.name, amount, category: e.category, is_household: isHousehold(e),
        expenseId: e.id, dueDate: due, ...(isOverdue ? { overdue: true } : {}),
      })
    })
  })

  // Card minimums use the same due-date logic (a card is a monthly item).
  const cardItems = cards.map((c) => ({ ...c, due_type: 'monthly', due_day: c.payment_due_date }))
  const cardDue = new Map(cardItems.map((c) => {
    if (!c.payment_due_date || !(c.minimum_payment > 0)) return [c.id, { overdue: null, dates: [] }]
    return [c.id, upcomingOccurrences(c, todayStr, endStr)]
  }))

  const days = []
  let balance = startBalance
  const owed = new Map(cards.map((c) => [c.id, c.current_balance || 0]))
  const paidSinceDue = new Map()
  const paycheckDays = new Set(job1?.amount_per_period ? paycheckDatesThrough(job1.last_paycheck_date, endStr) : [])

  for (let i = 0; i <= HORIZON; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dateStr = toISO(date)
    const events  = []

    // Paychecks still due (today or earlier but not yet received) land today.
    const paysToday = [...paycheckDays].filter((d) => i === 0 ? d <= dateStr : d === dateStr)
    paysToday.forEach((d) => events.push({
      type: 'income', name: job1.name || 'Job 1 Paycheck', amount: Number(job1.amount_per_period),
      payDate: d, pending: i === 0,
    }))

    events.push(...(expenseEvents.get(dateStr) || []))

    // Planned extras shrink what a card owes, so a card paid off earlier in the
    // horizon stops generating minimums.
    extras.filter((x) => x.dateStr === dateStr && x.cardId).forEach((x) => {
      owed.set(x.cardId, Math.max(0, (owed.get(x.cardId) ?? 0) - x.amount))
      paidSinceDue.set(x.cardId, (paidSinceDue.get(x.cardId) ?? 0) + x.amount)
    })

    cards.forEach((c) => {
      const { overdue, dates } = cardDue.get(c.id)
      const isOverdue = i === 0 && !!overdue
      const due = isOverdue ? overdue : dates.includes(dateStr) ? dateStr : null
      if (!due || !((owed.get(c.id) ?? 0) > 0)) return
      // A planned payment of at least the minimum before the due date covers it.
      if (!isOverdue && (paidSinceDue.get(c.id) ?? 0) >= c.minimum_payment) { paidSinceDue.set(c.id, 0); return }
      paidSinceDue.set(c.id, 0)
      const minDue = Math.min(c.minimum_payment, owed.get(c.id))
      owed.set(c.id, owed.get(c.id) - minDue)
      events.push({
        type: 'expense', name: `${c.name} (minimum)`, amount: minDue,
        category: 'credit_card', is_household: false, cardId: c.id, dueDate: due, overdue: isOverdue,
      })
    })

    extras.filter((x) => x.dateStr === dateStr).forEach((x) => {
      events.push({ type: 'expense', name: x.name, amount: x.amount, category: 'credit_card', is_household: false, isPlan: true, cardId: x.cardId })
    })

    const dayIn  = events.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
    const dayOut = events.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    balance = Math.round((balance + dayIn - dayOut) * 100) / 100

    days.push({ dateStr, date, events, dayIn, dayOut, balance, isToday: i === 0 })
  }

  return days
}

// ─── Aggressive card payoff plan ──────────────────────────────────────────────
// Walks the baseline projection day by day. On each day the amount that can
// leave the account without the balance ever dipping below `reserve` on any
// later day is  min(balance[k] for k ≥ d) − reserve  (a payment made on day d
// lowers every later balance by the same amount). That cash goes to the
// highest-APR card with debt left (avalanche). Because the check looks at the
// whole horizon, upcoming bills and paychecks are already accounted for.
export function planCardPayments({ baseline, cards, reserve = 0 }) {
  const remaining = new Map(cards.filter((c) => c.current_balance > 0).map((c) => [c.id, c.current_balance]))
  const order = [...cards].filter((c) => remaining.has(c.id)).sort((a, b) => (b.apr || 0) - (a.apr || 0))
  const payments = []
  let offset = 0

  // Suffix minimum of the baseline (reverse pass) so each day's lookup is O(1).
  const futureMin = new Array(baseline.length)
  let m = Infinity
  for (let i = baseline.length - 1; i >= 0; i--) {
    m = Math.min(m, baseline[i].balance)
    futureMin[i] = m
  }

  baseline.forEach((day, i) => {
    // Minimums already in the projection reduce what's left owed on that card
    // (planned extras are already netted out of the card balances passed in).
    day.events.forEach((e) => {
      if (e.cardId && !e.isPlan && remaining.has(e.cardId)) remaining.set(e.cardId, Math.max(0, remaining.get(e.cardId) - e.amount))
    })

    let safe = Math.floor(futureMin[i] - offset - reserve)
    for (const card of order) {
      if (safe < MIN_EXTRA_PAYMENT) break
      const owed = Math.ceil(remaining.get(card.id) || 0)
      if (owed <= 0) continue
      const amount = Math.min(safe, owed)
      if (amount < MIN_EXTRA_PAYMENT && amount < owed) continue
      payments.push({ dateStr: day.dateStr, cardId: card.id, cardName: card.name, apr: card.apr || 0, amount, daysLeft: baseline.length - 1 - i })
      remaining.set(card.id, remaining.get(card.id) - amount)
      offset += amount
      safe -= amount
    }
  })

  return summarize(payments, baseline[0]?.dateStr)
}

// Merges same-day/same-card payments and computes the plan's totals.
function summarize(list, today) {
  const merged = new Map()
  list.forEach((p) => {
    const key = `${p.dateStr}|${p.cardId}`
    const prev = merged.get(key)
    merged.set(key, prev ? { ...prev, amount: prev.amount + p.amount } : { ...p })
  })
  const payments = [...merged.values()].sort((a, b) => a.dateStr.localeCompare(b.dateStr) || b.apr - a.apr)
  const estInterestSaved = payments.reduce((s, p) => s + p.amount * (p.apr / 100) * (p.daysLeft / 365), 0)
  return {
    payments,
    totalPlanned: payments.reduce((s, p) => s + p.amount, 0),
    todayPayments: payments.filter((p) => p.dateStr === today),
    nextPayment: payments.find((p) => p.dateStr !== today) ?? null,
    estInterestSaved: Math.round(estInterestSaved * 100) / 100,
  }
}

function toExtras(payments) {
  return payments.map((p) => ({ dateStr: p.dateStr, cardId: p.cardId, name: `Pay ${p.cardName}`, amount: p.amount }))
}

// Days since the oldest account balance was last touched — the plan is only
// as good as the balance it starts from.
function balanceAgeDays(accounts) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ages = accounts.map((a) => {
    const ts = a.updated_at ?? a.created_at
    const ms = ts instanceof Date ? ts.getTime() : ts?.toMillis?.() ?? (ts?.seconds != null ? ts.seconds * 1000 : null)
    if (ms == null) return null
    const d = new Date(ms)
    d.setHours(0, 0, 0, 0)
    return daysBetween(d, today)
  }).filter((x) => x != null)
  return ages.length ? Math.max(...ages) : null
}

// One call that yields everything the page and the AI snapshot need, so both
// always see the same numbers.
export function buildCashFlowContext({ accounts, expenses, sources, cards, contributors, reserve = 0 }) {
  const startBalance = accounts.reduce((s, a) => s + (a.current_balance ?? 0), 0)
  const job1         = sources.find((s) => s.type === 'biweekly' && s.is_active !== false && s.is_active !== 0)
  const memberCount  = contributors.length + 1

  const effectiveExpenses = expenses
    .filter((e) => e.is_active !== false && e.is_active !== 0)
    .filter((e) => !(e.expense_type === 'installment' && e.completed_at))
    .map((e) => ({ ...e, amount: myShareOf(e, memberCount) }))

  const base     = { startBalance, effectiveExpenses, job1, cards }
  const baseline = buildTimeline(base)
  let plan       = planCardPayments({ baseline, cards, reserve })
  let timeline   = buildTimeline({ ...base, extras: toExtras(plan.payments) })

  // Extra payments can cover a card's minimum (or pay a card off), freeing
  // cash the first pass had set aside. Re-plan on the projection that
  // includes the payments so that cash also goes to cards — the balance
  // should end the horizon at the reserve, not above it.
  for (let pass = 0; pass < 3; pass++) {
    const paidSoFar = new Map()
    plan.payments.forEach((p) => paidSoFar.set(p.cardId, (paidSoFar.get(p.cardId) ?? 0) + p.amount))
    const cardsLeft = cards.map((c) => ({ ...c, current_balance: Math.max(0, (c.current_balance || 0) - (paidSoFar.get(c.id) ?? 0)) }))
    const more = planCardPayments({ baseline: timeline, cards: cardsLeft, reserve })
    if (more.payments.length === 0) break
    plan     = summarize([...plan.payments, ...more.payments], baseline[0]?.dateStr)
    timeline = buildTimeline({ ...base, extras: toExtras(plan.payments) })
  }

  return {
    startBalance, job1, baseline, plan, timeline,
    balanceAgeDays: balanceAgeDays(accounts),
    pendingPaycheck: baseline[0]?.events.find((e) => e.type === 'income' && e.pending) ?? null,
    overdue: baseline[0]?.events.filter((e) => e.overdue) ?? [],
  }
}

// Compact, AI-friendly view of the plan.
export function planForSnapshot({ plan, baseline, timeline, reserve, balanceAgeDays, pendingPaycheck, overdue }) {
  return {
    reserve_kept_in_checking: reserve,
    method: 'avalanche (highest APR first); every payment keeps the projected checking balance >= reserve on every day of the next 60 days, after bills, paychecks and card minimums',
    balances_last_updated_days_ago: balanceAgeDays,
    paycheck_today_not_confirmed: pendingPaycheck ? pendingPaycheck.amount : null,
    overdue_not_marked_paid: overdue.map((e) => ({ name: e.name, amount: e.amount })),
    safe_to_pay_today: plan.todayPayments.map((p) => ({ card: p.cardName, card_id: p.cardId, amount: p.amount })),
    next_payment: plan.nextPayment && { date: plan.nextPayment.dateStr, card: plan.nextPayment.cardName, amount: plan.nextPayment.amount },
    planned_payments: plan.payments.map((p) => ({ date: p.dateStr, card: p.cardName, amount: p.amount })),
    total_planned: plan.totalPlanned,
    est_interest_saved: plan.estInterestSaved,
    lowest_balance_without_plan: Math.min(...baseline.map((d) => d.balance)),
    lowest_balance_with_plan: Math.min(...timeline.map((d) => d.balance)),
  }
}
