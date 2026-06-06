import { create } from 'zustand'
import { accountService } from '../services/firestoreService'

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
}))
