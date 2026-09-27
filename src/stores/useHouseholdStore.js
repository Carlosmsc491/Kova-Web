import { create } from 'zustand'
import { householdService, householdDocService, inviteService, profileService } from '../services/firestoreService'
import { expenseService }   from '../services/firestoreService'
import { useRoleStore } from './useRoleStore'

function activeHouseholdExpenses(allExpenses) {
  return allExpenses.filter(
    (e) => (e.is_household === 1 || e.is_household === true) &&
            e.is_active !== 0 && e.is_active !== false &&
            !(e.expense_type === 'installment' && e.completed_at)
  )
}

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
      const householdExpenses = activeHouseholdExpenses(allExpenses)
      set({ contributors, householdExpenses, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  // Push the current share count + household expense list to the shared
  // Firestore household doc, so a member's view (which can't read the
  // owner's private contributors/expenses collections) never drifts from
  // what the owner sees locally. No-op until the owner has generated at
  // least one invite (no household doc exists yet).
  syncToHousehold: async () => {
    const hid = useRoleStore.getState().householdId
    if (!hid) return
    const shareParts = get().contributors.length + 1
    const allExpenses = await expenseService.getAll()
    await Promise.all([
      householdDocService.setShareParts(hid, shareParts),
      householdDocService.syncExpenses(hid, activeHouseholdExpenses(allExpenses)),
    ])
  },

  createContributor: async (data) => {
    await householdService.createContributor(data)
    await get().fetch()
    await get().syncToHousehold()
  },

  updateContributor: async (id, data) => {
    await householdService.updateContributor(id, data)
    await get().fetch()
    await get().syncToHousehold()
  },

  deleteContributor: async (id) => {
    await householdService.removeContributor(id)
    await get().fetch()
    await get().syncToHousehold()
  },

  generateInvite: async (ownerUid, invitedEmail, contributor = null) => {
    let hid = useRoleStore.getState().householdId
    if (!hid) {
      hid = await householdDocService.create(ownerUid)
      await profileService.set(ownerUid, { role: 'owner', household_id: hid })
      useRoleStore.getState().setHouseholdId(hid)
    }
    await get().syncToHousehold()
    const token = await inviteService.create(
      ownerUid, hid, invitedEmail,
      contributor?.id ?? null,
      contributor?.name ?? null,
    )
    return token
  },
}))
