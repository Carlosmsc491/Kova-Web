import { create } from 'zustand'
import { sendChatMessage } from '../services/aiService'
import { chatService } from '../services/firestoreService'

// Lazy-loaded store refreshers — imported at call time to avoid circular deps
function refreshStores(actionNames) {
  if (!actionNames?.length) return
  const has = (n) => actionNames.some((a) => a.includes(n))
  if (has('expense')) import('./useExpenseStore').then(({ useExpenseStore }) => useExpenseStore.getState().fetch())
  if (has('account')) import('./useAccountStore').then(({ useAccountStore }) => useAccountStore.getState().fetch())
  if (has('credit_card')) import('./useCreditStore').then(({ useCreditStore }) => useCreditStore.getState().fetch())
  if (has('goal')) import('./useGoalsStore').then(({ useGoalsStore }) => useGoalsStore.getState().fetch())
}

export const useAIStore = create((set, get) => ({
  messages:    [],
  loading:     false,
  error:       null,
  historyLoaded: false,

  loadHistory: async () => {
    try {
      const data = await chatService.getHistory()
      set({ messages: data, historyLoaded: true })
    } catch {
      set({ historyLoaded: true })
    }
  },

  send: async (userMessage, snapshot) => {
    set({ loading: true, error: null })

    const userMsg = { role: 'user', content: userMessage, id: Date.now() }
    const current = get().messages
    const next    = [...current, userMsg]
    set({ messages: next })

    const history = next.slice(0, -1).map((m) => ({ role: m.role, content: m.content }))

    try {
      const { text, actionsExecuted } = await sendChatMessage(userMessage, snapshot, history)
      const assistantMsg = { role: 'assistant', content: text, id: Date.now() + 1 }

      set((s) => ({ messages: [...s.messages, assistantMsg], loading: false }))

      // Refresh affected stores so UI reflects changes immediately
      if (actionsExecuted?.length) refreshStores(actionsExecuted)

      chatService.save('user', userMessage).catch(() => {})
      chatService.save('assistant', text).catch(() => {})

      return text
    } catch (e) {
      set({ error: e.message, loading: false })
      const errMsg = { role: 'assistant', content: `Error: ${e.message}`, id: Date.now() + 1 }
      set((s) => ({ messages: [...s.messages, errMsg] }))
      throw e
    }
  },

  clear: async () => {
    set({ messages: [] })
    chatService.clearAll().catch(() => {})
  },
}))
