import { create } from 'zustand'
import { accountService, transferService, historyService } from '../services/firestoreService'

export const useAccountStore = create((set) => ({
  accounts: [],
  loading:  false,
  error:    null,

  fetch: async () => {
    set({ loading: true })
    try {
      const data = await accountService.getAll()
      set({ accounts: data, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  create: async (payload) => {
    const item = await accountService.create(payload)
    set((s) => ({ accounts: [...s.accounts, item] }))
    return item
  },

  update: async (id, payload) => {
    const item = await accountService.update(id, payload)
    set((s) => ({ accounts: s.accounts.map((a) => a.id === id ? { ...a, ...item } : a) }))
    return item
  },

  remove: async (id) => {
    await accountService.remove(id)
    set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }))
  },

  getTotalBalance: () => {
    const { accounts } = useAccountStore.getState()
    return accounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0)
  },

  executeTransfer: async ({ from_account_id, to_account_id, amount, note }) => {
    const { accounts } = useAccountStore.getState()
    const fromAccount  = accounts.find((a) => a.id === from_account_id)
    const toAccount    = accounts.find((a) => a.id === to_account_id)
    if (!fromAccount || !toAccount) throw new Error('Account not found')

    const newFromBal = Math.round(((fromAccount.current_balance ?? 0) - amount) * 100) / 100
    const newToBal   = Math.round(((toAccount.current_balance ?? 0) + amount) * 100) / 100

    await accountService.update(from_account_id, { current_balance: newFromBal })
    await accountService.update(to_account_id,   { current_balance: newToBal })
    await transferService.create({
      from_account_id,
      to_account_id,
      from_account_name: fromAccount.name,
      to_account_name:   toAccount.name,
      amount,
      note:  note || null,
      date:  new Date().toISOString().split('T')[0],
    })
    await historyService.log(
      'transfer',
      `Transferred $${amount.toFixed(2)} from ${fromAccount.name} to ${toAccount.name}${note ? ` — ${note}` : ''}`,
      amount,
      { from_account_id, to_account_id },
    )

    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === from_account_id ? { ...a, current_balance: newFromBal } :
        a.id === to_account_id   ? { ...a, current_balance: newToBal }   : a
      ),
    }))
  },
}))
