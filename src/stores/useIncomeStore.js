import { create } from 'zustand'
import { incomeService } from '../services/firestoreService'

export const useIncomeStore = create((set, get) => ({
  sources:  [],
  job2Days: [],
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

  fetchJob2Days: async (sourceId) => {
    if (!sourceId) return
    const days = await incomeService.getJob2Days(sourceId)
    set({ job2Days: days })
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

  logJob2Day: async (payload) => {
    const item = await incomeService.logDay(payload)
    set((s) => ({ job2Days: [...s.job2Days, item] }))
    return item
  },

  unlogJob2Day: async (id) => {
    await incomeService.unlogDay(id)
    set((s) => ({ job2Days: s.job2Days.filter((d) => d.id !== id) }))
  },

  markAllJob2Paid: async () => {
    const job2 = get().sources.find((s) => s.type === 'variable_daily')
    if (!job2) return
    await incomeService.markAllPaid(job2.id)
    set((s) => ({
      job2Days: s.job2Days.map((d) => ({ ...d, paid: true })),
    }))
  },

  // Computed helpers
  getJob1: () => get().sources.find((s) => s.type === 'biweekly'),
  getJob2: () => get().sources.find((s) => s.type === 'variable_daily'),
  getJob2Pending: () => {
    const unpaid = get().job2Days.filter((d) => !d.paid)
    return {
      pending_amount: unpaid.reduce((s, d) => s + (d.day_rate ?? 110), 0),
      days: unpaid,
    }
  },
}))
