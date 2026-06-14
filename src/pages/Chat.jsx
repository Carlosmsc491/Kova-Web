import { useState, useRef, useEffect } from 'react'
import { Send, RotateCcw, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAIStore }      from '../stores/useAIStore'
import { useExpenseStore } from '../stores/useExpenseStore'
import { useIncomeStore }  from '../stores/useIncomeStore'
import { useCreditStore }  from '../stores/useCreditStore'
import { useGoalsStore }   from '../stores/useGoalsStore'
import { useAccountStore } from '../stores/useAccountStore'
import { formatCurrency }  from '../lib/formatters'

// ─── helpers ─────────────────────────────────────────────────────────────────
function isPaidThisCycle(expense) {
  if (!expense.last_paid_date) return false
  const paid = new Date(expense.last_paid_date)
  const now  = new Date()
  if (expense.due_type === 'biweekly') return (now - paid) / 86400000 < 14
  return paid.getFullYear() === now.getFullYear() && paid.getMonth() === now.getMonth()
}

// ─── snapshot builder ─────────────────────────────────────────────────────────
function nextBiweeklyDate(lastPaidDateStr) {
  if (!lastPaidDateStr) return null
  const d = new Date(lastPaidDateStr + 'T12:00:00')
  d.setDate(d.getDate() + 14)
  return d.toISOString().split('T')[0]
}

function buildSnapshot({ accounts, expenses, sources, job2Days, utilization, goals }) {
  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance ?? 0), 0)
  const unpaidDays   = job2Days.filter((d) => !d.paid)
  const today        = new Date().toISOString().split('T')[0]

  const active = expenses.filter((e) => e.is_active !== false && e.is_active !== 0)
  const personal  = active.filter((e) => e.is_household !== true && e.is_household !== 1)
  const household = active.filter((e) => e.is_household === true || e.is_household === 1)

  const personalTotal = personal.reduce((s, e) => s + (e.amount || 0), 0)
  const myShareTotal  = household.reduce((s, e) => s + (e.my_share ?? e.amount ?? 0), 0)

  return {
    today,
    total_balance:      totalBalance,
    accounts:           accounts.map((a) => ({ name: a.name, institution: a.institution, balance: a.current_balance })),
    income_sources:     sources.map((s) => ({
      name:              s.name,
      type:              s.type,
      amount_per_period: s.amount_per_period || s.daily_rate,
      last_paid_date:    s.last_paid_date ?? null,
      next_payment_date: s.type === 'biweekly' ? nextBiweeklyDate(s.last_paid_date) : null,
    })),
    job2_pending:       unpaidDays.reduce((s, d) => s + (d.day_rate ?? 110), 0),
    job2_unpaid_days:   unpaidDays.length,
    personal_expenses:  personal.map((e) => ({
      name: e.name, amount: e.amount, category: e.category, due_day: e.due_day,
      paid_this_cycle: isPaidThisCycle(e),
    })),
    household_expenses: household.map((e) => ({
      name: e.name, total_amount: e.amount, my_share: e.my_share ?? e.amount,
      category: e.category, due_day: e.due_day,
      paid_this_cycle: isPaidThisCycle(e),
    })),
    monthly_personal_total: personalTotal,
    monthly_my_share_total: myShareTotal,
    monthly_total_obligation: personalTotal + myShareTotal,
    credit_cards:       utilization?.cards?.map((c) => ({ name: c.name, balance: c.current_balance, limit: c.credit_limit, apr: c.apr, utilization: c.utilization_pct?.toFixed(1) + '%' })) ?? [],
    credit_utilization: utilization?.total_utilization_pct?.toFixed(1) + '%',
    active_goals:       goals.map((g) => ({ name: g.name, current: g.current_amount, target: g.target_amount, progress: g.target_amount > 0 ? ((g.current_amount/g.target_amount)*100).toFixed(0) + '%' : '0%' })),
  }
}

// ─── Clean AI response — strip markdown tables and horizontal rules ───────────
function cleanAIResponse(text) {
  const lines = text.split('\n')
  const out   = []

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i]
    const trimmed = line.trim()

    // Skip separator rows like |---|---| or |:---|:---|
    if (/^\|[\s\-:]+(\|[\s\-:]+)*\|?$/.test(trimmed)) continue

    // Skip bare horizontal rules
    if (/^[-*_]{3,}$/.test(trimmed)) continue

    // Convert table data rows: | A | B | C | → - A · B · C
    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean)
      if (cells.length > 0) out.push(`- ${cells.join(' · ')}`)
      continue
    }

    out.push(line)
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

���───────────────────────────────────────────────────
const mdComponents = {
  p:      ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
  em:     ({ children }) => <em className="italic text-accent-primary">{children}</em>,
  h1: ({ children }) => <p className="font-semibold text-text-primary text-sm mb-1">{children}</p>,
  h2: ({ children }) => <p className="font-semibold text-text-primary text-sm mb-1">{children}</p>,
  h3: ({ children }) => <p className="font-medium text-text-primary text-xs mb-1">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 space-y-0.5 pl-3">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 space-y-0.5 pl-3 list-decimal">{children}</ol>,
  li: ({ children }) => (
    <li className="flex gap-1.5 leading-relaxed">
      <span className="text-accent-primary mt-1.5 shrink-0">·</span><span>{children}</span>
    </li>
  ),
  code: ({ children }) => <code className="bg-bg-tertiary text-accent-primary text-xs px-1 py-0.5 rounded font-mono">{children}</code>,
  hr: () => <hr className="border-border-color my-2"/>,
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0">
        <span className="text-accent-primary text-xs font-bold">K</span>
      </div>
      <div className="bg-bg-secondary border border-border-color rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
        {[0,1,2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s`}}/>
        ))}
      </div>
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser  = msg.role === 'user'
  const content = isUser ? msg.content : cleanAIResponse(msg.content)
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0 mb-auto mt-0.5">
          <span className="text-accent-primary text-xs font-bold">K</span>
        </div>
      )}
      <div className={`px-3.5 py-2.5 text-sm leading-relaxed max-w-[82%] ${
        isUser
          ? 'bg-accent-primary text-white rounded-2xl rounded-tr-sm'
          : 'bg-bg-secondary border border-border-color text-text-secondary rounded-2xl rounded-tl-sm'
      }`}>
        {isUser
          ? <span className="whitespace-pre-wrap">{content}</span>
          : <ReactMarkdown components={mdComponents}>{content}</ReactMarkdown>}
      </div>
    </div>
  )
}

// ─── Suggestions ─────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  '¿Cuánto puedo gastar esta semana sin quedar corto?',
  '¿Qué tarjeta debo pagar primero?',
  '¿Cuánto tengo verdaderamente disponible?',
  'How much should I save from my next paycheck?',
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Chat() {
  const { messages, loading, historyLoaded, send, clear, loadHistory } = useAIStore()
  const { expenses } = useExpenseStore()
  const { sources, job2Days } = useIncomeStore()
  const { utilization } = useCreditStore()
  const { goals } = useGoalsStore()
  const { accounts } = useAccountStore()

  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { if (!historyLoaded) loadHistory() }, [historyLoaded, loadHistory])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const snapshot = buildSnapshot({ accounts, expenses, sources, job2Days, utilization, goals })
    try { await send(text, snapshot) } catch {}
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend() }
  }

  const apiKeyMissing = !import.meta.env.VITE_ANTHROPIC_API_KEY

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {apiKeyMissing && (
          <div className="bg-accent-warning/10 border border-accent-warning/30 rounded-2xl p-4 text-sm">
            <p className="text-accent-warning font-semibold mb-1">API Key Missing</p>
            <p className="text-text-muted text-xs">Add <code className="bg-bg-tertiary px-1 rounded">VITE_ANTHROPIC_API_KEY</code> to your <code className="bg-bg-tertiary px-1 rounded">.env.local</code> file and rebuild.</p>
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-primary to-purple-800 flex items-center justify-center mb-4">
              <span className="text-white text-xl font-bold">K</span>
            </div>
            <p className="text-text-primary font-semibold mb-1">Ask Kova anything</p>
            <p className="text-text-muted text-sm mb-5">I have access to your accounts, expenses, goals, and credit.</p>
            <div className="space-y-2 w-full max-w-xs">
              {SUGGESTIONS.map((q) => (
                <button key={q} onClick={() => { setInput(q); inputRef.current?.focus() }}
                  className="w-full text-left text-xs text-text-secondary bg-bg-secondary border border-border-color rounded-xl px-3 py-2.5 hover:border-accent-primary/40 hover:text-text-primary transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => <Bubble key={m.id ?? i} msg={m} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-border-color bg-bg-primary">
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button onClick={clear} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors">
              <RotateCcw size={12}/> Clear
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-bg-secondary border border-border-color rounded-2xl px-3 py-2 focus-within:border-accent-primary/50 transition-colors">
          <textarea ref={inputRef} rows={1}
            className="flex-1 bg-transparent text-text-primary text-sm resize-none outline-none placeholder-text-muted min-h-[20px] max-h-[100px]"
            placeholder="Ask or request an action…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSend} disabled={!input.trim() || loading}
            className="w-7 h-7 rounded-xl bg-accent-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-accent-primary/90 transition-colors shrink-0">
            <Send size={13}/>
          </button>
        </div>
        <p className="text-text-muted text-xs mt-1.5 text-center">Tap → to send · ⌘Enter on desktop</p>
      </div>
    </div>
  )
}
