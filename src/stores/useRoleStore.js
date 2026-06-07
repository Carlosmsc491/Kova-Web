import { create } from 'zustand'
import { profileService } from '../services/firestoreService'
import { auth } from '../firebase'

const OWNER_EMAIL = 'kova-user@kova-app.com'

export const useRoleStore = create((set) => ({
  role:        null,   // 'owner' | 'member' | null
  householdId: null,
  loaded:      false,

  init: async (uid) => {
    if (!uid) { set({ role: null, householdId: null, loaded: true }); return }
    if (auth.currentUser?.email === OWNER_EMAIL) {
      const profile = await profileService.get(uid)
      set({ role: 'owner', householdId: profile?.household_id ?? null, loaded: true })
      return
    }
    const profile = await profileService.get(uid)
    if (profile?.role === 'member') {
      set({ role: 'member', householdId: profile.household_id, loaded: true })
    } else {
      set({ role: null, householdId: null, loaded: true })
    }
  },

  setHouseholdId: (hid) => set({ householdId: hid }),
}))
