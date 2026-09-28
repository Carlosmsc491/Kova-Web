import { create } from 'zustand'
import { incomeService } from '../services/firestoreService'

export const useIncomeStore = create((set, get) => ({
  sources:  [],
  loading:  false,
  error:    null,

  fetchSources: async () => {
    set({ loading: true })
    try {
      const data = await incomeService.getSources()
      set({ sources: data, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  createSource: async (payload) => {
    const item = await incomeService.createSource(payload)
    set((s) => ({ sources: [...s.sources, item] }))
    return item
  },

  updateSource: async (id, payload) => {
    const item = await incomeService.updateSource(id, payload)
    set((s) => ({ sources: s.sources.map((x) => x.id === id ? { ...x, ...item } : x) }))
    return item
  },

  // Excludes archived/inactive sources, matching Household's income total.
  getJob1: () => get().sources.find((s) => s.type === 'biweekly' && s.is_active !== false && s.is_active !== 0),
}))
