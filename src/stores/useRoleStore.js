import { create } from 'zustand'
import { profileService } from '../services/firestoreService'
import { OWNER_UID } from '../config'

export const useRoleStore = create((set) => ({
  role:        null,   // 'owner' | 'member' | 'denied' | null
  householdId: null,
  loaded:      false,

  // The owner is one fixed account; members are written only by the
  // joinHousehold Cloud Function. Any other login is denied — the database
  // rules refuse it too, this just shows a clear screen instead of errors.
  init: async (uid) => {
    if (!uid) { set({ role: null, householdId: null, loaded: true }); return }
    set({ loaded: false }) // don't show the previous account's role meanwhile
    const profile = await profileService.get(uid).catch(() => null)
    if (uid === OWNER_UID) {
      set({ role: 'owner', householdId: profile?.household_id ?? null, loaded: true })
    } else if (profile?.role === 'member') {
      set({ role: 'member', householdId: profile.household_id, loaded: true })
    } else {
      set({ role: 'denied', householdId: null, loaded: true })
    }
  },

  setHouseholdId: (hid) => set({ householdId: hid }),
}))
