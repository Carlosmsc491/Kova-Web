import { useEffect, useMemo, useRef, useState } from 'react'

import {
  TrendingUp, TrendingDown, AlertTriangle, Landmark, Zap, Sparkles, CreditCard,
  RefreshCw, Check, Clock, ShieldCheck,
} from 'lucide-react'
import { useExpenseStore }    from '../stores/useExpenseStore'
import { useIncomeStore }     from '../stores/useIncomeStore'
import { useAccountStore }    from '../stores/useAccountStore'
import { useHouseholdStore }  from '../stores/useHouseholdStore'
import { useCreditStore }     from '../stores/useCreditStore'
import { useGoalsStore }      from '../stores/useGoalsStore'

import { toast }              from '../stores/useToastStore'
import { usePaymentStore }    from '../stores/usePaymentStore'
import PaySheet               from '../components/shared/PaySheet'
import RecentActivity         from '../components/shared/RecentActivity'
import { formatCurrency }     from '../lib/formatters'
import { HORIZON, buildCashFlowContext } from '../lib/cashFlowEngine'
import { buildSnapshot, RESERVE_KEY, loadReserve } from '../lib/snapshot'
import { analyzeCashFlow }    from '../services/aiService'
import { insightService }     from '../services/firestoreService'

// ─── Event row ─────────────────────────────────────────────────────────────────
function EventRow({ event, onPay, onReceive }) {
  const isIncome = event.type === 'income'
  const payable  = !isIncome && (event.expenseId || event.cardId)
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isIncome ? 'bg-accent-secondary' : event.isPlan ? 'bg-accent-primary' : 'bg-accent-danger'}`} />
        <span className={`text-sm truncate ${event.isPlan ? 'text-accent-primary font-medium' : 'text-text-secondary'}`}>
          {event.isPlan && <Zap size={11} className="inline mr-1 -mt-0.5" />}
          {event.name}
          {event.is_household && <span className="text-text-muted text-xs ml-1">(my share)</span>}
          {event.overdue && <span className="text-accent-warning text-xs ml-1">(overdue)</span>}
          {event.pending && <span className="text-accent-warning text-xs ml-1">(not received yet)</span>}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`font-mono text-sm font-semibold ${isIncome ? 'text-accent-secondary' : 'text-accent-danger'}`}>
          {isIncome ? '+' : '−'}{formatCurrency(event.amount)}
        </span>
        {payable && (
          <button onClick={() => onPay(event)}
            className="text-[11px] font-semibold text-accent-primary border border-accent-primary/30 rounded-md px-1.5 py-0.5 hover:bg-accent-primary/10">
            Pay
          </button>
        )}
        {event.pending && (
          <button onClick={() => onReceive(event)}
            className="text-[11px] font-semibold text-accent-secondary border border-accent-secondary/30 rounded-md px-1.5 py-0.5">
            Got it
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Day card ─────────────────────────────────────────────────────────────────
function DayCard({ day, startBalance, minBalance, onPay, onReceive }) {
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

      {events.length > 0 && (
        <div className="border-t border-border-color pt-2 mb-2">
          {events.map((e, i) => <EventRow key={i} event={e} onPay={onPay} onReceive={onReceive} />)}
          {(events.length > 1 || (hasIncome && hasExpense)) && (
            <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border-color/50">
              <span className="text-text-muted text-xs">
                {hasIncome && hasExpense ? 'Net' : hasExpense ? 'Total expenses' : 'Total income'}
              </span>
              <span className={`font-mono text-xs font-bold ${(dayIn - dayOut) >= 0 ? 'text-accent-secondary' : 'text-accent-danger'}`}>
                {(dayIn - dayOut) >= 0 ? '+' : '−'}{formatCurrency(Math.abs(dayIn - dayOut))}
              </span>
            </div>
          )}
        </div>
      )}

      <div className={`flex items-center justify-between pt-1 ${events.length > 0 ? 'border-t border-border-color' : ''}`}>
        <span className="text-text-muted text-xs">{isToday ? 'End of today' : 'Balance after'}</span>
        <span className={`font-mono text-sm font-bold ${balance >= 0 ? 'text-text-primary' : 'text-accent-danger'}`}>
          {formatCurrency(balance)}
        </span>
      </div>
    </div>
  )
}

function MonthLabel({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-border-color" />
      <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-border-color" />
    </div>
  )
}

const fmtDay = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── Things to confirm before trusting today's number ────────────────────────
function Checklist({ ctx, accounts, onReceive, onPay, onSaveBalance }) {
  const { pendingPaycheck, overdue, balanceAgeDays } = ctx
  const stale = balanceAgeDays != null && balanceAgeDays >= 1
  const [balances, setBalances] = useState({})
  const [toAccount, setToAccount] = useState('')
  if (!pendingPaycheck && overdue.length === 0 && !stale) return null
  const dest = toAccount || accounts[0]?.id || ''

  return (
    <div className="bg-accent-warning/10 border border-accent-warning/30 rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-accent-warning" />
        <p className="text-text-primary text-sm font-semibold">Confirm before paying</p>
      </div>

      {pendingPaycheck && (
        <div className="space-y-1.5">
          <p className="text-text-secondary text-xs">
            {pendingPaycheck.name} <span className="font-mono">{formatCurrency(pendingPaycheck.amount)}</span> was due {pendingPaycheck.payDate}. Did it arrive?
            <span className="text-text-muted"> (Set a deposit account in Income and it's added automatically.)</span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {accounts.length > 0 && (
              <>
                <select value={dest} onChange={(e) => setToAccount(e.target.value)}
                  className="bg-bg-secondary border border-border-color rounded-lg text-xs text-text-primary px-2 py-1.5">
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <button onClick={() => onReceive(pendingPaycheck, dest)}
                  className="text-xs font-semibold bg-accent-secondary text-white rounded-lg px-2.5 py-1.5">
                  Add to account
                </button>
              </>
            )}
            <button onClick={() => onReceive(pendingPaycheck, null)}
              className="text-xs font-semibold border border-border-color text-text-primary rounded-lg px-2.5 py-1.5">
              Already in my balance
            </button>
          </div>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-text-secondary text-xs">Past due and not recorded as paid — counted as still owed today:</p>
          {overdue.map((e) => (
            <div key={(e.expenseId || e.cardId) + e.name} className="flex items-center justify-between gap-2">
              <span className="text-text-primary text-xs truncate">{e.name} <span className="font-mono text-text-muted">{formatCurrency(e.amount)}</span></span>
              <button onClick={() => onPay(e)}
                className="shrink-0 text-[11px] font-semibold border border-border-color text-text-primary rounded-lg px-2 py-1">
                Record payment
              </button>
            </div>
          ))}
          <p className="text-text-muted text-[11px]">Paid a while ago and your bank balance already shows it? Choose "Already reflected".</p>
        </div>
      )}

      {stale && (
        <div className="space-y-1.5">
          <p className="text-text-secondary text-xs">
            Balances were last updated <span className="font-semibold">{balanceAgeDays} day{balanceAgeDays === 1 ? '' : 's'} ago</span>. The plan starts from them — check your bank:
          </p>
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <span className="text-text-primary text-xs flex-1 truncate">{a.name}</span>
              <div className="flex items-center bg-bg-secondary border border-border-color rounded-lg px-2 w-28">
                <span className="text-text-muted text-xs">$</span>
                <input type="number" step="0.01" inputMode="decimal"
                  className="w-full bg-transparent text-text-primary text-xs font-mono py-1 pl-1 outline-none"
                  value={balances[a.id] ?? String(a.current_balance ?? 0)}
                  onChange={(e) => setBalances((b) => ({ ...b, [a.id]: e.target.value }))} />
              </div>
              <button onClick={() => onSaveBalance(a.id, parseFloat(balances[a.id] ?? a.current_balance))}
                className="text-[11px] font-semibold bg-accent-primary text-white rounded-lg px-2 py-1">
                <Check size={11} className="inline -mt-0.5" /> Save
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Kova AI review + payment plan ────────────────────────────────────────────
// The AI reads the full 60-day cash flow and gives the numbers. The
// deterministic plan is the safety net: the AI may pay less, never more than
// what keeps the balance >= reserve on every future day.
function clampReview(review, plan, cards) {
  if (!review) return null
  const limit = plan.todayPayments.reduce((s, p) => s + p.amount, 0)
  const byId  = new Map(cards.map((c) => [c.id, c]))
  let items = (review.pay_today || [])
    .filter((p) => byId.has(p.card_id) && p.amount > 0)
    .map((p) => ({ ...p, amount: Math.min(Math.floor(p.amount), Math.ceil(byId.get(p.card_id).current_balance || 0)) }))
  const total = items.reduce((s, p) => s + p.amount, 0)
  let adjusted = false
  if (total > limit) {
    // Scale down proportionally to the safe limit.
    const k = limit / total
    items = items.map((p) => ({ ...p, amount: Math.floor(p.amount * k) })).filter((p) => p.amount > 0)
    adjusted = true
  }
  return { ...review, pay_today: items, adjusted, limit }
}

function PlanCard({ plan, review, reviewState, onRefresh, reserve, setReserve, onPayCard, noCards }) {
  const fallback = !review // AI unavailable → show the calculated plan
  const today = fallback
    ? plan.todayPayments.map((p) => ({ card_id: p.cardId, card: p.cardName, amount: p.amount, reason: `${p.apr}% APR` }))
    : review.pay_today
  const todayTotal = today.reduce((s, p) => s + p.amount, 0)
  const schedule = fallback
    ? plan.payments.filter((p) => !plan.todayPayments.includes(p)).map((p) => ({ date: p.dateStr, card: p.cardName, amount: p.amount }))
    : review.schedule || []
  const grouped = Object.entries(schedule.reduce((acc, p) => { (acc[p.date] ||= []).push(p); return acc }, {}))
  return (
    <div className="bg-accent-primary/10 border border-accent-primary/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-accent-primary" />
        <p className="text-text-primary text-sm font-semibold">Kova AI · card payoff</p>
      </div>

      {reviewState === 'loading' && (
        <p className="text-text-muted text-xs flex items-center gap-1.5"><Clock size={12} /> Reviewing your cash flow…</p>
      )}
      {reviewState === 'error' && (
        <p className="text-accent-warning text-xs">AI review unavailable right now — showing the calculated plan.</p>
      )}
      {review?.headline && <p className="text-text-primary text-sm leading-snug">{review.headline}</p>}

      {noCards ? (
        <p className="text-text-muted text-xs">No cards with a balance — nothing to pay down.</p>
      ) : (
        <>
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-text-muted text-xs">Pay today</p>
              <p className="text-text-muted text-[11px] flex items-center gap-1">
                <ShieldCheck size={11} /> safe limit {formatCurrency(plan.todayPayments.reduce((s, p) => s + p.amount, 0))}
              </p>
            </div>
            <p className={`font-mono font-bold text-2xl ${todayTotal > 0 ? 'text-accent-primary' : 'text-text-muted'}`}>
              {formatCurrency(todayTotal)}
            </p>
            {review?.adjusted && (
              <p className="text-accent-warning text-[11px]">AI suggested more than is safe — trimmed to the limit.</p>
            )}
            <div className="space-y-1.5 mt-1.5">
              {today.map((p) => (
                <div key={p.card_id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-text-primary text-xs">
                      <CreditCard size={11} className="inline mr-1 -mt-0.5" />
                      <span className="font-mono font-semibold">{formatCurrency(p.amount)}</span> → {p.card}
                    </p>
                    {p.reason && <p className="text-text-muted text-[11px] truncate">{p.reason}</p>}
                  </div>
                  <button onClick={() => onPayCard(p)}
                    className="shrink-0 text-[11px] font-semibold bg-accent-primary text-white rounded-lg px-2 py-1">
                    Pay
                  </button>
                </div>
              ))}
            </div>
            {todayTotal === 0 && (
              <p className="text-text-muted text-xs mt-0.5">
                {grouped.length ? `Nothing is safe today — next window ${fmtDay(grouped[0][0])}.` : 'Nothing is safe to pay in the next 60 days with this reserve.'}
              </p>
            )}
          </div>

          {grouped.length > 0 && (
            <div className="border-t border-accent-primary/20 pt-2 space-y-1.5">
              <p className="text-text-muted text-xs">All upcoming payments</p>
              {grouped.map(([date, ps]) => (
                <div key={date} className="flex items-start justify-between gap-3 text-xs">
                  <span className="text-text-secondary shrink-0">{fmtDay(date)}</span>
                  <span className="font-mono text-text-primary text-right">
                    {ps.map((p) => `${formatCurrency(p.amount)} ${p.card}`).join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {review?.warnings?.length > 0 && (
            <div className="border-t border-accent-primary/20 pt-2 space-y-1">
              {review.warnings.map((w, i) => (
                <p key={i} className="text-accent-warning text-xs flex gap-1.5"><AlertTriangle size={12} className="shrink-0 mt-0.5" />{w}</p>
              ))}
            </div>
          )}
          {review?.questions?.length > 0 && (
            <div className="space-y-1">
              {review.questions.map((q, i) => <p key={i} className="text-text-secondary text-xs">❓ {q}</p>)}
            </div>
          )}

          <div className="flex items-center justify-between text-xs border-t border-accent-primary/20 pt-2">
            <span className="text-text-muted">Est. interest saved (calculated plan)</span>
            <span className="font-mono font-semibold text-accent-secondary">~{formatCurrency(plan.estInterestSaved)}</span>
          </div>
        </>
      )}

      <div className="flex items-center gap-2 border-t border-accent-primary/20 pt-2">
        <label className="text-text-muted text-xs shrink-0" htmlFor="reserve">Keep in checking</label>
        <div className="flex items-center bg-bg-secondary border border-border-color rounded-lg px-2 flex-1 max-w-[110px]">
          <span className="text-text-muted text-xs">$</span>
          <input id="reserve" type="number" min="0" step="50" inputMode="decimal"
            className="w-full bg-transparent text-text-primary text-sm font-mono py-1 pl-1 outline-none"
            value={reserve} onChange={(e) => setReserve(Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <button onClick={onRefresh} disabled={reviewState === 'loading'}
          className="ml-auto flex items-center gap-1 text-xs font-semibold bg-accent-primary text-white rounded-lg px-2.5 py-1.5 disabled:opacity-50">
          <RefreshCw size={12} className={reviewState === 'loading' ? 'animate-spin' : ''} />
          {reviewState === 'loading' ? 'Analyzing…' : 'Update analysis'}
        </button>
      </div>
    </div>
  )
}

// Stable fingerprint of what the review depends on: if none of this changed,
// the cached review is still valid and no new AI call is made.
function reviewHash(snapshot) {
  const { today, total_balance, credit_cards, card_payment_plan, cash_flow_next_60_days } = snapshot
  return JSON.stringify({ today, total_balance, credit_cards, card_payment_plan, cash_flow_next_60_days })
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CashFlow() {
  const { expenses, fetch: fetchExpenses } = useExpenseStore()
  const { sources, fetchSources } = useIncomeStore()
  const { accounts, fetch: fetchAccounts, update: updateAccount } = useAccountStore()
  const { contributors, fetch: fetchHousehold }  = useHouseholdStore()
  const { cards, utilization, fetch: fetchCards } = useCreditStore()
  const receivePaycheck = usePaymentStore((s) => s.receivePaycheck)
  const { goals, fetch: fetchGoals }             = useGoalsStore()

  const [reserve, setReserve]           = useState(loadReserve)
  const [payTarget, setPayTarget]       = useState(null)
  const [review, setReview]             = useState(null)
  const [reviewState, setReviewState]   = useState('idle') // idle | loading | ready | error
  const lastHash = useRef(null)

  useEffect(() => {
    fetchExpenses(); fetchSources(); fetchAccounts(); fetchHousehold(); fetchCards(); fetchGoals()
  }, [fetchExpenses, fetchSources, fetchAccounts, fetchHousehold, fetchCards, fetchGoals])

  useEffect(() => {
    try { localStorage.setItem(RESERVE_KEY, String(reserve)) } catch { /* storage blocked: setting just won't persist */ }
  }, [reserve])

  // Recomputed on every render from the live stores, so any balance, bill,
  // paycheck or card change (including ones the AI makes) re-plans instantly.
  const ctx = buildCashFlowContext({ accounts, expenses, sources, cards, contributors, reserve })
  const { startBalance: totalBalance, baseline, plan, timeline } = ctx

  const loading = accounts.length === 0 && expenses.length === 0
  const snapshot = useMemo(
    () => buildSnapshot({ accounts, expenses, sources, utilization, goals, contributors }),
    // reserve is read inside buildSnapshot from storage
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accounts, expenses, sources, utilization, goals, contributors, reserve],
  )

  const runReview = async (hash, force = false) => {
    if (!force && hash === lastHash.current) return
    lastHash.current = hash
    setReviewState('loading')
    try {
      const result = await analyzeCashFlow(snapshot)
      if (lastHash.current !== hash) return // data changed mid-flight; a newer run owns the state
      setReview(result)
      setReviewState('ready')
      insightService.set('cashflow', hash, result).catch(() => {})
    } catch {
      if (lastHash.current === hash) { setReview(null); setReviewState('error') }
    }
  }

  // Real-time review: re-run (debounced) whenever the underlying numbers
  // change; reuse the stored review when they haven't.
  useEffect(() => {
    if (loading || cards.length === 0) return
    const hash = reviewHash(snapshot)
    if (hash === lastHash.current) return
    let cancelled = false
    const t = setTimeout(async () => {
      const cached = await insightService.get('cashflow').catch(() => null)
      if (cancelled) return
      if (cached?.hash === hash) {
        lastHash.current = hash
        setReview(cached.result)
        setReviewState('ready')
      } else {
        runReview(hash)
      }
    }, 1500)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, loading, cards.length])

  const shownReview = clampReview(review, plan, cards)

  // Default account to pay cards from: where the paycheck lands, else the first checking.
  const defaultAccountId = (() => {
    const dest = accounts.find((a) => a.id === ctx.job1?.destination_account_id)
    return (dest || accounts.find((a) => (a.account_type ?? 'checking') === 'checking') || accounts[0])?.id ?? null
  })()

  // Opens the pay sheet for a cash-flow event or a plan line.
  const openPay = (ev) => {
    if (ev.expenseId) {
      const exp = expenses.find((e) => e.id === ev.expenseId)
      setPayTarget({
        kind: 'expense', id: ev.expenseId, name: ev.name, amount: ev.amount, dueDate: ev.dueDate,
        defaultSource: exp?.default_pay_source ?? (exp?.account_id ? { type: 'account', id: exp.account_id } : null),
      })
    } else {
      const cardId = ev.cardId ?? ev.card_id
      const card = cards.find((c) => c.id === cardId)
      if (!card) return
      setPayTarget({ kind: 'card', id: cardId, name: card.name, amount: ev.amount, defaultSource: { type: 'account', id: defaultAccountId } })
    }
  }

  const handleReceive = async (ev, accountId) => {
    if (!ctx.job1) return
    await receivePaycheck(ctx.job1.id, { payDate: ev.payDate, accountId })
    toast.success(accountId ? 'Paycheck added to your balance' : 'Paycheck confirmed')
  }

  const handleSaveBalance = async (id, balance) => {
    if (!Number.isFinite(balance)) return
    await updateAccount(id, { current_balance: balance })
    toast.success('Balance updated')
  }

  const endBalance   = timeline[timeline.length - 1]?.balance ?? totalBalance
  const totalIn      = timeline.reduce((s, d) => s + d.dayIn, 0)
  const totalOut     = timeline.reduce((s, d) => s + d.dayOut, 0)
  // Extra card payments pay down existing debt — shown apart from bills so
  // "out" isn't mistaken for spending more than you earn.
  const extraToCards = plan.totalPlanned
  const billsOut     = totalOut - extraToCards
  // The low-point warning looks at the projection WITHOUT the plan, since the
  // plan deliberately drives the balance down to the reserve.
  const minBalance   = Math.min(...baseline.map((d) => d.balance))
  const minDay       = baseline.find((d) => d.balance === minBalance)

  const eventDays = timeline.filter((d) => d.events.length > 0 || d.isToday)
  let lastMonth = -1
  const cardsWithDebt = cards.filter((c) => c.current_balance > 0)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-display text-text-primary">Cash Flow</h2>
        <p className="text-text-muted text-xs mt-0.5">Next {HORIZON} days · day by day</p>
      </div>

      {!loading && (
        <>
          <Checklist ctx={ctx} accounts={accounts} onReceive={handleReceive} onPay={openPay} onSaveBalance={handleSaveBalance} />
          <PlanCard plan={plan} review={shownReview} reviewState={reviewState}
            onRefresh={() => runReview(reviewHash(snapshot), true)}
            reserve={reserve} setReserve={setReserve}
            onPayCard={openPay} noCards={cardsWithDebt.length === 0} />
          <RecentActivity />
        </>
      )}

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
            <p className="text-text-muted text-xs">Bills & minimums</p>
          </div>
          <p className="font-mono font-bold text-lg text-accent-danger">−{formatCurrency(billsOut)}</p>
        </div>
        <div className="col-span-2 bg-accent-primary/5 border border-accent-primary/20 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Zap size={12} className="text-accent-primary" />
              <p className="text-text-muted text-xs">Extra to cards (paying down debt)</p>
            </div>
            <p className="text-text-muted text-[11px]">
              {formatCurrency(totalBalance)} now + {formatCurrency(totalIn)} in − {formatCurrency(billsOut)} bills − {formatCurrency(extraToCards)} debt = {formatCurrency(endBalance)}
            </p>
          </div>
          <p className="font-mono font-bold text-lg text-accent-primary shrink-0">−{formatCurrency(extraToCards)}</p>
        </div>
      </div>

      {minBalance < totalBalance * 0.25 && minDay && (
        <div className="bg-accent-warning/10 border border-accent-warning/30 rounded-2xl p-3.5 flex items-start gap-3">
          <AlertTriangle size={16} className="text-accent-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-text-primary text-sm font-semibold">Low point warning</p>
            <p className="text-text-muted text-xs mt-0.5">
              Even without extra card payments, balance dips to <span className="font-mono font-semibold text-accent-danger">{formatCurrency(minBalance)}</span> on {minDay.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}

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
                <DayCard day={day} startBalance={totalBalance} minBalance={minBalance} onPay={openPay} onReceive={(ev) => handleReceive(ev, defaultAccountId)} />
              </div>
            )
          })}
        </div>
      )}

      <PaySheet target={payTarget} onClose={() => setPayTarget(null)} />

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
