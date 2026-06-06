import { create } from 'zustand'
import { creditService } from '../services/firestoreService'

function computeUtilization(cards) {
  const totalBalance = cards.reduce((s, c) => s + (c.current_balance || 0), 0)
  const totalLimit   = cards.reduce((s, c) => s + (c.credit_limit || 0), 0)
  const totalUtil    = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0
  return {
    total_balance:         totalBalance,
    total_limit:           totalLimit,
    total_utilization_pct: totalUtil,
    cards: cards.map((c) => ({
      ...c,
      utilization_pct: c.credit_limit > 0
        ? ((c.current_balance || 0) / c.credit_limit) * 100
        : 0,
      available_credit: (c.credit_limit || 0) - (c.current_balance || 0),
    })),
  }
}

export const useCreditStore = create((set, get) => ({
  cards:       [],
  utilization: null,
  loading:     false,
  error:       null,

  fetch: async () => {
    set({ loading: true })
    try {
      const data = await creditService.getAll()
      set({ cards: data, utilization: computeUtilization(data), loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  create: async (payload) => {
    const item = await creditService.create({
      ...payload,
      available_credit: (payload.credit_limit || 0) - (payload.current_balance || 0),
    })
    set((s) => {
      const cards = [...s.cards, item]
      return { cards, utilization: computeUtilization(cards) }
    })
    return item
  },

  update: async (id, payload) => {
    const item = await creditService.update(id, {
      ...payload,
      available_credit: (payload.credit_limit || 0) - (payload.current_balance || 0),
    })
    set((s) => {
      const cards = s.cards.map((c) => c.id === id ? { ...c, ...item } : c)
      return { cards, utilization: computeUtilization(cards) }
    })
    return item
  },

  remove: async (id) => {
    await creditService.remove(id)
    set((s) => {
      const cards = s.cards.filter((c) => c.id !== id)
      return { cards, utilization: computeUtilization(cards) }
    })
  },

  markPaid: async (id, amount) => {
    const card = get().cards.find((c) => c.id === id)
    if (!card) return
    const updated = await creditService.markPaid(id, card, amount)
    set((s) => {
      const cards = s.cards.map((c) => c.id === id ? { ...c, ...updated } : c)
      return { cards, utilization: computeUtilization(cards) }
    })
    return updated
  },
}))
