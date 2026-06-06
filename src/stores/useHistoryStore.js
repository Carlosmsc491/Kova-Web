import { create } from 'zustand'
import { historyService } from '../services/firestoreService'

export const useHistoryStore = create((set) => ({
  events:  [],
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const data = await historyService.getAll()
      set({ events: data.reverse(), loading: false }) // newest first
    } catch (e) {
      set({ loading: false })
    }
  },

  log: async (type, description, amount, meta) => {
    const item = await historyService.log(type, description, amount, meta)
    set((s) => ({ events: [item, ...s.events] }))
    return item
  },
}))

// Convenience singleton
export const logEvent = (type, description, amount, meta) =>
  useHistoryStore.getState().log(type, description, amount, meta)
