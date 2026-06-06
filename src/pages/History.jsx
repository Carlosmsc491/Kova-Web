import { useEffect } from 'react'
import {
  DollarSign, CreditCard, Target, CheckCircle, Clock, TrendingUp, AlertCircle,
} from 'lucide-react'
import { useHistoryStore } from '../stores/useHistoryStore'
import { formatCurrency, formatDate } from '../lib/formatters'

const TYPE_CONFIG = {
  expense_created:    { Icon: DollarSign,   color: 'text-accent-danger',   bg: 'bg-accent-danger/10'   },
  expense_paid:       { Icon: CheckCircle,  color: 'text-accent-secondary', bg: 'bg-accent-secondary/10' },
  credit_payment:     { Icon: CreditCard,   color: 'text-accent-primary',   bg: 'bg-accent-primary/10'  },
  goal_contribution:  { Icon: Target,       color: 'text-accent-secondary', bg: 'bg-accent-secondary/10' },
  job2_paid:          { Icon: TrendingUp,   color: 'text-accent-warning',   bg: 'bg-accent-warning/10'  },
  income_logged:      { Icon: TrendingUp,   color: 'text-accent-secondary', bg: 'bg-accent-secondary/10' },
  default:            { Icon: AlertCircle,  color: 'text-text-muted',       bg: 'bg-bg-tertiary'         },
}

function EventRow({ event }) {
  const cfg    = TYPE_CONFIG[event.type] || TYPE_CONFIG.default
  const Icon   = cfg.Icon
  const ts     = event.created_at?.seconds
    ? new Date(event.created_at.seconds * 1000)
    : event.date ? new Date(event.date + 'T00:00:00') : new Date()

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-border-color last:border-0">
      <div className={`p-2 rounded-xl shrink-0 ${cfg.bg}`}>
        <Icon size={14} className={cfg.color}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium">{event.description}</p>
        <p className="text-text-muted text-xs mt-0.5">
          {ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {' · '}
          {ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {event.amount != null && (
        <p className={`font-mono font-bold text-sm shrink-0 ${cfg.color}`}>
          {formatCurrency(Math.abs(event.amount))}
        </p>
      )}
    </div>
  )
}

// Group events by date
function groupByDate(events) {
  const groups = {}
  events.forEach((e) => {
    const ts = e.created_at?.seconds ? new Date(e.created_at.seconds * 1000) : new Date(e.date + 'T00:00:00')
    const key = ts.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })
  return groups
}

export default function History() {
  const { events, loading, fetch } = useHistoryStore()

  useEffect(() => { fetch() }, [fetch])

  const groups = groupByDate(events)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-display text-text-primary">History</h2>
        <p className="text-text-muted text-xs mt-0.5">Activity log</p>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin"/>
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-10 text-center">
          <Clock size={32} className="text-text-muted mx-auto mb-3"/>
          <p className="text-text-primary font-semibold mb-1">No events yet</p>
          <p className="text-text-muted text-sm">Actions you take in KOVA will appear here.</p>
        </div>
      )}

      {Object.entries(groups).map(([date, dayEvents]) => (
        <div key={date}>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">{date}</p>
          <div className="bg-bg-secondary border border-border-color rounded-2xl overflow-hidden">
            {dayEvents.map((e, i) => <EventRow key={e.id ?? i} event={e} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
