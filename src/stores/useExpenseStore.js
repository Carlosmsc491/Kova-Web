import { create } from 'zustand'
import { expenseService } from '../services/firestoreService'

export const useExpenseStore = create((set, get) => ({
  expenses: [],
  loading:  false,
  error:    null,

  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const data = await expenseService.getAll()
      set({ expenses: data, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  create: async (payload) => {
    const item = await expenseService.create({
      ...payload,
      is_active: true,
      expense_type: payload.expense_type || 'recurring',
      remaining_balance: payload.expense_type === 'installment'
        ? (payload.original_balance || 0)
        : null,
    })
    set((s) => ({ expenses: [...s.expenses, item] }))
    return item
  },

  update: async (id, payload) => {
    const item = await expenseService.update(id, payload)
    set((s) => ({ expenses: s.expenses.map((e) => e.id === id ? { ...e, ...item } : e) }))
    return item
  },

  toggle: async (id) => {
    const expense = get().expenses.find((e) => e.id === id)
    if (!expense) return
    const result = await expenseService.toggle(id, expense.is_active)
    set((s) => ({ expenses: s.expenses.map((e) => e.id === id ? { ...e, ...result } : e) }))
  },

  remove: async (id) => {
    await expenseService.remove(id)
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }))
  },

  markPaid: async (id) => {
    const result = await expenseService.markPaid(id)
    set((s) => ({ expenses: s.expenses.map((e) => e.id === id ? { ...e, ...result } : e) }))
  },

  unmarkPaid: async (id) => {
    const result = await expenseService.unmarkPaid(id)
    set((s) => ({ expenses: s.expenses.map((e) => e.id === id ? { ...e, ...result } : e) }))
  },

  markInstallmentPayment: async (id) => {
    const expense = get().expenses.find((e) => e.id === id)
    if (!expense) return
    const result = await expenseService.markInstallmentPayment(id, expense)
    set((s) => ({ expenses: s.expenses.map((e) => e.id === id ? { ...e, ...result } : e) }))
    return result
  },
}))
