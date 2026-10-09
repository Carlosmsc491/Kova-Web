import { create } from 'zustand'
import { paymentService, incomeService, accountService } from '../services/firestoreService'
import { paycheckDatesThrough, todayISO, toISO } from '../lib/dateUtils'
import { useExpenseStore } from './useExpenseStore'
import { useCreditStore }  from './useCreditStore'
import { useAccountStore } from './useAccountStore'
import { useIncomeStore }  from './useIncomeStore'
import { useHistoryStore } from './useHistoryStore'

// Every payment touches an item plus an account or card; refetch whatever the
// ledger transaction wrote so all pages show the same balances.
function refresh(kinds) {
  const k = new Set(kinds)
  const jobs = [useAccountStore.getState().fetch(), useHistoryStore.getState().fetch()]
  if (k.has('expense')) jobs.push(useExpenseStore.getState().fetch())
  if (k.has('card'))    jobs.push(useCreditStore.getState().fetch())
  if (k.has('paycheck')) jobs.push(useIncomeStore.getState().fetchSources())
  return Promise.all(jobs)
}

export const usePaymentStore = create((set, get) => ({
  recent: [],

  fetchRecent: async () => {
    try { set({ recent: await paymentService.recent(20) }) } catch { /* offline: keep what we have */ }
  },

  payExpense: async (expenseId, opts) => {
    const r = await paymentService.payExpense(expenseId, opts)
    // Paying with a card raises that card's balance.
    await refresh(['expense', ...(opts.source.type === 'card' ? ['card'] : [])])
    get().fetchRecent()
    return r
  },

  payCard: async (cardId, opts) => {
    const r = await paymentService.payCard(cardId, opts)
    await refresh(['card'])
    get().fetchRecent()
    return r
  },

  receivePaycheck: async (sourceId, opts) => {
    const r = await paymentService.receivePaycheck(sourceId, opts)
    await refresh(['paycheck'])
    get().fetchRecent()
    return r
  },

  undo: async (paymentId) => {
    const p = get().recent.find((x) => x.id === paymentId)
    await paymentService.undo(paymentId)
    await refresh([p?.kind, p?.source_type === 'card' ? 'card' : null].filter(Boolean))
    get().fetchRecent()
  },

  // Latest payment for an item that can still be undone (used by "Undo" on rows).
  latestFor: (targetId) => get().recent.find((p) => p.target_id === targetId && !p.undone) ?? null,

  // Payday: credit every paycheck that has come due since the last recorded
  // one to the job's destination account. Runs on app load; the ledger makes
  // it idempotent, and each credit shows in Recent activity with Undo.
  autoReceivePaychecks: async () => {
    try {
      const [sources, accounts] = await Promise.all([incomeService.getSources(), accountService.getAll()])
      const job = sources.find((s) => s.type === 'biweekly' && s.is_active !== false && s.is_active !== 0)
      if (!job?.amount_per_period || !job.last_paycheck_date) return 0
      const dest = accounts.find((a) => a.id === job.destination_account_id)
      if (!dest) return 0 // no destination chosen: Cash Flow asks instead
      const today = todayISO()
      const due = paycheckDatesThrough(job.last_paycheck_date, today)
      // Only recent paychecks are credited blind. An older one (app not opened
      // for weeks, or the last-paycheck date was edited back) might already be
      // in the balance — Cash Flow asks about those instead.
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 3)
      if (due.length === 0 || due[0] < toISO(cutoff)) return 0
      let credited = 0
      for (const payDate of due) {
        const r = await paymentService.receivePaycheck(job.id, { payDate, accountId: dest.id, auto: true })
        if (!r.skipped) credited++
      }
      if (credited) { await refresh(['paycheck']); get().fetchRecent() }
      return credited
    } catch {
      return 0
    }
  },
}))
