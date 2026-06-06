/**
 * Anthropic API service — called directly from browser.
 * Requires VITE_ANTHROPIC_API_KEY in .env.local
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are Kova, a personal financial assistant. You have access to the user's complete financial picture including:
- Bank account balances
- Income sources (Job 1 biweekly, Job 2 variable daily at $110/day)
- Fixed monthly expenses and installment loans
- Credit cards (utilization, APR, payment dates)
- Savings goals and progress
- Cash flow projections (Truly Available money concept)

**Truly Available Money**: The amount the user can safely spend today without jeopardizing future obligations. Calculated as current balance minus the minimum future balance point over the next 60 days.

Your role:
1. Help the user understand their financial position clearly and honestly
2. Recommend which bills to pay from which accounts
3. Advise on credit card utilization (target below 30%)
4. Calculate safe amounts to save or transfer
5. Answer financial questions in simple, direct language
6. Flag if cash flow looks tight

Always be honest. If money is tight, say so clearly. Never recommend spending committed money.
Respond in whichever language the user uses (English or Spanish). Keep responses concise and actionable.`

export async function sendChatMessage(userMessage, snapshot, history = []) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('VITE_ANTHROPIC_API_KEY not set. Add it to your .env.local file.')
  }

  // Build context from snapshot
  const contextBlock = snapshot ? `
<financial_context>
${JSON.stringify(snapshot, null, 2)}
</financial_context>
` : ''

  // Build message history for the API
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: contextBlock
        ? `${contextBlock}\n\n${userMessage}`
        : userMessage,
    },
  ]

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':         'application/json',
      'x-api-key':            apiKey,
      'anthropic-version':    '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  return data.content[0]?.text ?? ''
}
