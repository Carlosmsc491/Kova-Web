import { create } from 'zustand'
import { householdService } from '../services/firestoreService'
import { expenseService }   from '../services/firestoreService'

export const useHouseholdStore = create((set, get) => ({
  contributors: [],
  householdExpenses: [],
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const [contributors, allExpenses] = await Promise.all([
        householdService.getContributors(),
        expenseService.getAll(),
      ])
      const householdExpenses = allExpenses.filter(
        (e) => (e.is_household === 1 || e.is_household === true) &&
                e.is_active !== 0 && e.is_active !== false &&
                !(e.expense_type === 'installment' && e.completed_at)
      )
      set({ contributors, householdExpenses, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createContributor: async (data) => {
    await householdService.createContributor(data)
    await get().fetch()
  },

  updateContributor: async (id, data) => {
    await householdService.updateContributor(id, data)
    await get().fetch()
  },

  deleteContributor: async (id) => {
    await householdService.removeContributor(id)
    await get().fetch()
  },
}))
