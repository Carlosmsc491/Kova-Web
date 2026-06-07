import { create } from 'zustand'
import { householdService, householdDocService, inviteService, profileService } from '../services/firestoreService'
import { expenseService }   from '../services/firestoreService'
import { useRoleStore } from './useRoleStore'

export const useHouseholdStore = create((set, get) => ({
  contributors: [],
  householdExpenses: [],
  householdId: null,
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

  generateInvite: async (ownerUid, householdExpenses) => {
    let hid = useRoleStore.getState().householdId
    if (!hid) {
      hid = await householdDocService.create(ownerUid)
      await profileService.set(ownerUid, { role: 'owner', household_id: hid })
      useRoleStore.getState().setHouseholdId(hid)
    }
    await householdDocService.syncExpenses(hid, householdExpenses)
    const token = await inviteService.create(ownerUid, hid)
    return token
  },
}))
