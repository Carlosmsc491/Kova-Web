/**
 * AI service — every model call goes through Firebase Cloud Functions, so the
 * Anthropic API key only ever lives server-side (never in the browser bundle).
 */
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../firebase'

const functions = getFunctions(app)
const chatFn    = httpsCallable(functions, 'chat')
// The review reads the whole 60-day cash flow; give it room to think.
const analyzeFn = httpsCallable(functions, 'analyzeCashFlow', { timeout: 120_000 })

export async function sendChatMessage(userMessage, snapshot, history = []) {
  const result = await chatFn({ message: userMessage, snapshot, history })
  return { text: result.data.text, actionsExecuted: result.data.actionsExecuted ?? [] }
}

// Asks Kova AI to review the cash flow and card plan. Returns the structured
// review: { headline, pay_today[], schedule[], warnings[], questions[] }.
export async function analyzeCashFlow(snapshot) {
  const result = await analyzeFn({ snapshot })
  return result.data
}
