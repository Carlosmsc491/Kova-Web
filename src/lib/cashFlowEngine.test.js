import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRequire } from 'module'
import {
  firstUnpaidOccurrence, nextOccurrenceAfter, isPaidThisCycle, upcomingOccurrences, paycheckDatesThrough,
} from './dateUtils'
import { buildCashFlowContext, myShareOf } from './cashFlowEngine'

const serverDueDates = createRequire(import.meta.url)('../../functions/dueDates.js')

// All tests run on Fri Oct 9 2026 (a payday).
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 9, 10, 0, 0)) })
afterEach(() => vi.useRealTimers())

const created = (iso) => ({ toMillis: () => new Date(iso + 'T12:00:00').getTime() })
const monthly = (name, amount, due_day, extra = {}) => ({ id: name, name, amount, due_type: 'monthly', due_day, is_active: true, created_at: created('2026-06-07'), ...extra })
const weekly  = (name, amount, due_day) => ({ id: name, name, amount, due_type: 'weekly', due_day, is_active: true, created_at: created('2026-09-27') })

// The user's real data as of Oct 9 2026.
const fixture = () => ({
  accounts: [{ id: 'chase', name: 'Chase', account_type: 'checking', current_balance: 2000, updated_at: new Date(2026, 9, 9) }],
  sources: [
    { id: 'club', name: 'Club', type: 'variable_daily' },
    { id: 'job', name: 'Elite Flower', type: 'biweekly', amount_per_period: 2000, last_paycheck_date: '2026-10-09' },
  ],
  contributors: [{ id: 'roommate' }],
  cards: [
    { id: 'apple', name: 'Apple Card', current_balance: 190, minimum_payment: 35, payment_due_date: 29, apr: 25.49, credit_limit: 3500, created_at: created('2026-06-07') },
    { id: 'cap1', name: 'Capital One', current_balance: 994, minimum_payment: 50, payment_due_date: 12, apr: 28.49, credit_limit: 13000, last_paid_date: '2026-06-07', created_at: created('2026-06-07') },
    { id: 'bofa', name: 'BofA', current_balance: 3997, minimum_payment: 80, payment_due_date: 7, apr: 27, credit_limit: 5000, last_paid_date: '2026-06-17', created_at: created('2026-06-07') },
    { id: 'citi', name: 'Citi', current_balance: 0, minimum_payment: 35, payment_due_date: 1, apr: 26.49, credit_limit: 3400, created_at: created('2026-06-07') },
  ],
  expenses: [
    monthly('Rent', 2240, 1, { is_household: true, my_share: 1120, contributors: [{}, {}], last_paid_date: '2026-10-09' }),
    monthly('FPL', 150, 1, { is_household: true, my_share: 75, contributors: [{}, {}], last_paid_date: '2026-10-09' }),
    monthly('Water', 100, 1, { is_household: true, my_share: 50, contributors: [{}, {}], last_paid_date: '2026-10-09' }),
    monthly('Car parking', 75, 1, { is_household: true, my_share: 37.5, contributors: [{}, {}], last_paid_date: '2026-10-09' }),
    monthly('Rent insurance', 15, 1, { is_household: true, my_share: 7.5, contributors: [{}, {}], last_paid_date: '2026-10-09' }),
    monthly('Car', 530, 24, { last_paid_date: '2026-08-15' }),
    monthly('Insurance', 175, 26, { last_paid_date: '2026-08-15' }),
    monthly('Sofa', 110, 23, { last_paid_date: '2026-08-15' }),
    monthly('WiFi', 45, 10, { is_household: true, my_share: 22.5, contributors: [{}, {}] }),
    monthly('T-Mobile', 200, 10),
    weekly('Gas', 45, 0),
    weekly('Food', 100, 6),
    monthly('Macbook', 174, 6, { expense_type: 'installment', remaining_balance: 2088, original_balance: 2088, created_at: { toMillis: () => new Date('2026-10-07T01:00:00Z').getTime() } }),
  ],
})

describe('due dates', () => {
  it('paying covers one due date, so an early payment hides it until the next one', () => {
    const rent = { due_type: 'monthly', due_day: 1, paid_through: '2026-11-01' }
    expect(firstUnpaidOccurrence(rent, '2026-10-30')).toBe('2026-12-01')
    expect(isPaidThisCycle(rent, new Date(2026, 9, 30))).toBe(true)
  })

  it('clamps the 31st to short months', () => {
    expect(nextOccurrenceAfter({ due_type: 'monthly', due_day: 31 }, '2026-01-31')).toBe('2026-02-28')
    expect(nextOccurrenceAfter({ due_type: 'monthly', due_day: 31 }, '2026-11-15')).toBe('2026-11-30')
  })

  it('rolls monthly dates across the year end', () => {
    expect(nextOccurrenceAfter({ due_type: 'monthly', due_day: 5 }, '2026-12-05')).toBe('2027-01-05')
  })

  it('anchors biweekly bills on their first due date when never paid', () => {
    const gym = { due_type: 'biweekly', due_date: '2026-10-15' }
    expect(firstUnpaidOccurrence(gym, '2026-10-09')).toBe('2026-10-15')
    expect(nextOccurrenceAfter(gym, '2026-10-15')).toBe('2026-10-29')
  })

  it('treats the old last_paid_date as paid for that month', () => {
    const car = { due_type: 'monthly', due_day: 24, last_paid_date: '2026-08-15' }
    expect(firstUnpaidOccurrence(car, '2026-10-09')).toBe('2026-09-24')
    // …but a missed due date from a previous month is not counted overdue now
    expect(upcomingOccurrences(car, '2026-10-09', '2026-12-08')).toEqual({ overdue: null, dates: ['2026-10-24', '2026-11-24'] })
  })

  it('counts this month’s missed due date as overdue', () => {
    const bill = { due_type: 'monthly', due_day: 7 }
    expect(upcomingOccurrences(bill, '2026-10-09', '2026-11-08').overdue).toBe('2026-10-07')
  })

  it('lists paychecks every 14 days', () => {
    expect(paycheckDatesThrough('2026-10-09', '2026-11-20')).toEqual(['2026-10-23', '2026-11-06', '2026-11-20'])
  })

  it('server copy of the due-date logic matches the app', () => {
    const items = [
      { due_type: 'monthly', due_day: 31, last_paid_date: '2026-09-02' },
      { due_type: 'weekly', due_day: 0, paid_through: '2026-10-04' },
      { due_type: 'biweekly', due_date: '2026-09-01' },
      { due_type: 'one-time', due_date: '2026-10-20' },
      { due_type: 'monthly', due_day: 12 },
    ]
    for (const it of items) expect(serverDueDates.firstUnpaidOccurrence(it, '2026-10-09')).toBe(firstUnpaidOccurrence(it, '2026-10-09'))
  })
})

describe('household share', () => {
  it('uses a saved custom split, else an even split', () => {
    expect(myShareOf({ is_household: true, amount: 100, my_share: 70, contributors: [{}, {}] }, 2)).toBe(70)
    expect(myShareOf({ is_household: true, amount: 100 }, 4)).toBe(25)
    expect(myShareOf({ amount: 100 }, 4)).toBe(100)
  })
})

describe('cash flow with the real data', () => {
  const ctx = () => { const f = fixture(); return buildCashFlowContext({ ...f, reserve: 0 }) }

  it('projects exactly the independently computed bills', () => {
    const { baseline } = ctx()
    const byDate = Object.fromEntries(baseline.filter((d) => d.events.length).map((d) => [d.dateStr, d.events.map((e) => `${e.name}:${e.amount}`).sort()]))
    expect(byDate['2026-10-09']).toEqual(['BofA (minimum):80']) // Macbook was created on its due day → not overdue
    expect(byDate['2026-10-10']).toEqual(['Food:100', 'T-Mobile:200', 'WiFi:22.5'])
    expect(byDate['2026-10-23']).toEqual(['Elite Flower:2000', 'Sofa:110'])
    expect(byDate['2026-11-01']).toEqual(['Car parking:37.5', 'FPL:75', 'Gas:45', 'Rent insurance:7.5', 'Rent:1120', 'Water:50'])
    expect(byDate['2026-11-06']).toEqual(['Elite Flower:2000', 'Macbook:174'])
    // No paycheck on Oct 9: it was already recorded today
    expect(baseline[0].events.some((e) => e.type === 'income')).toBe(false)
  })

  it('income is 4 paychecks and the totals balance', () => {
    const { timeline, plan, startBalance } = ctx()
    const income = timeline.reduce((s, d) => s + d.dayIn, 0)
    const out = timeline.reduce((s, d) => s + d.dayOut, 0)
    expect(income).toBe(8000)
    expect(startBalance + income - out).toBeCloseTo(timeline.at(-1).balance, 2)
    expect(plan.totalPlanned).toBeGreaterThan(0)
  })

  it('aggressive plan ends at the reserve and never goes below it', () => {
    for (const reserve of [0, 300]) {
      const f = fixture()
      const { timeline } = buildCashFlowContext({ ...f, reserve })
      const min = Math.min(...timeline.map((d) => d.balance))
      expect(min).toBeGreaterThanOrEqual(reserve)
      expect(timeline.at(-1).balance - reserve).toBeLessThan(25) // only sub-$25 dust may remain
    }
  })

  it('pays the highest APR first and never more than a card owes', () => {
    const { plan } = ctx()
    expect(plan.todayPayments[0].cardName).toBe('Capital One')
    const paid = {}
    plan.payments.forEach((p) => { paid[p.cardId] = (paid[p.cardId] ?? 0) + p.amount })
    expect(paid.cap1).toBeLessThanOrEqual(994)
    expect(paid.bofa ?? 0).toBeLessThanOrEqual(3997)
    expect(paid.citi).toBeUndefined()
  })

  it('a planned payment of at least the minimum covers that month’s minimum', () => {
    const { timeline } = ctx()
    const capOneMinOct12 = timeline.find((d) => d.dateStr === '2026-10-12').events.find((e) => e.name === 'Capital One (minimum)')
    expect(capOneMinOct12).toBeUndefined()
  })

  it('stops an installment once the loan is paid off', () => {
    const f = fixture()
    f.expenses = f.expenses.map((e) => e.name === 'Macbook' ? { ...e, remaining_balance: 200 } : e)
    const { baseline } = buildCashFlowContext({ ...f, reserve: 0 })
    const mac = baseline.flatMap((d) => d.events.filter((e) => e.name === 'Macbook').map((e) => e.amount))
    expect(mac).toEqual([174, 26])
  })

  it('a paycheck that came due but was not recorded shows as pending today', () => {
    const f = fixture()
    f.sources[1].last_paycheck_date = '2026-09-25'
    const c = buildCashFlowContext({ ...f, reserve: 0 })
    expect(c.pendingPaycheck).toMatchObject({ amount: 2000, payDate: '2026-10-09' })
  })
})
