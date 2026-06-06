import { create } from 'zustand'
import { goalService } from '../services/firestoreService'

export const useGoalsStore = create((set, get) => ({
  goals:   [],
  loading: false,
  error:   null,

  fetch: async () => {
    set({ loading: true })
    try {
      const data = await goalService.getAll()
      set({ goals: data.filter((g) => !g.is_completed), loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  create: async (payload) => {
    const item = await goalService.create(payload)
    set((s) => ({ goals: [...s.goals, item] }))
    return item
  },

  update: async (id, payload) => {
    const item = await goalService.update(id, payload)
    set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...item } : g) }))
    return item
  },

  addContribution: async (id, amount) => {
    const goal = get().goals.find((g) => g.id === id)
    if (!goal) return
    const result = await goalService.addContrib(id, goal, amount)
    if (result.is_completed) {
      set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
    } else {
      set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...result } : g) }))
    }
    return result
  },

  markComplete: async (id) => {
    await goalService.markComplete(id)
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
  },

  remove: async (id) => {
    await goalService.remove(id)
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
  },
}))
