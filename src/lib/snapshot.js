import { isPaidThisCycle, todayISO, getNextPaycheckDate } from './dateUtils.js'
import { buildCashFlowContext, planForSnapshot, myShareOf } from './cashFlowEngine.js'

export const RESERVE_KEY = 'kova_cashflow_reserve'

export function loadReserve() {
  try { return Math.max(0, Number(localStorage.getItem(RESERVE_KEY)) || 0) } catch { return 0 }
}

export function buildSnapshot({ accounts, expenses, sources, utilization, goals, contributors = [], reserve: reserveOverride }) {
  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance ?? 0), 0)
  const today        = todayISO()

  const active = expenses.filter((e) => e.is_active !== false && e.is_active !== 0)
  const personal  = active.filter((e) => e.is_household !== true && e.is_household !== 1)
  const household = active.filter((e) => e.is_household === true || e.is_household === 1)

  const personalTotal = personal.reduce((s, e) => s + (e.amount || 0), 0)
  const memberCount   = contributors.length + 1
  const myShareTotal  = household.reduce((s, e) => s + myShareOf(e, memberCount), 0)

  const cards   = utilization?.cards ?? []
  // The server has no localStorage, so it passes the reserve saved in Firestore.
  const reserve = reserveOverride ?? loadReserve()
  const cf      = buildCashFlowContext({ accounts, expenses, sources, cards, contributors, reserve })

  return {
    today,
    total_balance:      totalBalance,
    accounts:           accounts.map((a) => ({ id: a.id, name: a.name, institution: a.institution, type: a.account_type ?? 'checking', balance: a.current_balance })),
    income_sources:     sources.filter((s) => s.type === 'biweekly').map((s) => ({
      id:                s.id,
      name:              s.name,
      type:              s.type,
      amount_per_period: s.amount_per_period,
      last_paid_date:    s.last_paycheck_date ?? null,
      next_payment_date: s.last_paycheck_date ? getNextPaycheckDate(s.last_paycheck_date) : null,
    })),
    personal_expenses:  personal.map((e) => ({
      id: e.id, name: e.name, amount: e.amount, category: e.category,
      due_type: e.due_type || 'monthly', due_day: e.due_day, due_date: e.due_date ?? null,
      paid_this_cycle: isPaidThisCycle(e),
    })),
    household_expenses: household.map((e) => ({
      id: e.id, name: e.name, total_amount: e.amount, my_share: myShareOf(e, memberCount),
      category: e.category, due_type: e.due_type || 'monthly', due_day: e.due_day, due_date: e.due_date ?? null,
      paid_this_cycle: isPaidThisCycle(e),
    })),
    monthly_personal_total: personalTotal,
    monthly_my_share_total: myShareTotal,
    monthly_total_obligation: personalTotal + myShareTotal,
    credit_cards:       cards.map((c) => ({
      id: c.id, name: c.name, balance: c.current_balance, limit: c.credit_limit, apr: c.apr,
      minimum_payment: c.minimum_payment, payment_due_day: c.payment_due_date, statement_cut_day: c.statement_cut_date, last_paid_date: c.last_paid_date ?? null,
      utilization: c.utilization_pct?.toFixed(1) + '%',
    })),
    credit_utilization: utilization?.total_utilization_pct?.toFixed(1) + '%',
    card_payment_plan:  planForSnapshot({ ...cf, reserve }),
    // The projection WITHOUT extra card payments — what the AI verifies the
    // plan against. Only days with activity; balance is end-of-day checking.
    cash_flow_next_60_days: cf.baseline
      .filter((d) => d.events.length > 0 || d.isToday)
      .map((d) => ({
        date: d.dateStr,
        events: d.events.map((e) => ({
          name: e.name, amount: e.type === 'income' ? e.amount : -e.amount,
          ...(e.overdue ? { overdue_not_marked_paid: true } : {}),
          ...(e.pending ? { paycheck_not_confirmed: true } : {}),
        })),
        balance_after: d.balance,
      })),
    active_goals:       goals.map((g) => ({ id: g.id, name: g.name, current: g.current_amount, target: g.target_amount, progress: g.target_amount > 0 ? ((g.current_amount/g.target_amount)*100).toFixed(0) + '%' : '0%' })),
  }
}
