import { create } from 'zustand'
import { sendChatMessage } from '../services/aiService'
import { chatService } from '../services/firestoreService'

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

    // Build history for API (last 20 msgs, without the user one we just added)
    const history = next.slice(-21, -1).map((m) => ({ role: m.role, content: m.content }))

    try {
      const reply = await sendChatMessage(userMessage, snapshot, history)
      const assistantMsg = { role: 'assistant', content: reply, id: Date.now() + 1 }

      set((s) => ({ messages: [...s.messages, assistantMsg], loading: false }))

      // Persist both messages to Firestore (best effort)
      chatService.save('user', userMessage).catch(() => {})
      chatService.save('assistant', reply).catch(() => {})

      return reply
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
