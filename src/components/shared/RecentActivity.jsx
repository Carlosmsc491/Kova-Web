import { useEffect, useState } from 'react'
import { Undo2, History } from 'lucide-react'
import { usePaymentStore } from '../../stores/usePaymentStore'
import { toast } from '../../stores/useToastStore'
import { formatCurrency } from '../../lib/formatters'

function describe(p) {
  if (p.kind === 'paycheck') return `${p.target_name}${p.source_name ? ` → ${p.source_name}` : ''}${p.auto ? ' · auto' : ''}`
  if (p.source_type === 'card') return `${p.target_name} · charged to ${p.source_name}`
  if (p.source_type === 'account') return `${p.target_name} · from ${p.source_name}`
  return `${p.target_name} · balance unchanged`
}

// Every recorded payment, paycheck and card payment, newest first, with Undo.
export default function RecentActivity({ limit = 8 }) {
  const { recent, fetchRecent, undo } = usePaymentStore()
  const [busy, setBusy] = useState(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => { fetchRecent() }, [fetchRecent])

  if (recent.length === 0) return null
  const list = showAll ? recent : recent.slice(0, limit)

  const handleUndo = async (p) => {
    setBusy(p.id)
    try {
      await undo(p.id)
      toast.success(`Undone: ${p.target_name}`)
    } catch (e) {
      toast.error(e.message || 'Could not undo')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <History size={14} className="text-text-muted" />
        <p className="text-text-primary text-sm font-semibold">Recent activity</p>
      </div>
      <div className="divide-y divide-border-color">
        {list.map((p) => (
          <div key={p.id} className={`flex items-center gap-2 py-2 ${p.undone ? 'opacity-40' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className={`text-xs truncate ${p.undone ? 'line-through text-text-muted' : 'text-text-primary'}`}>{describe(p)}</p>
              <p className="text-text-muted text-[11px]">{p.date}{p.undone ? ' · undone' : ''}</p>
            </div>
            <span className={`font-mono text-xs font-semibold ${p.kind === 'paycheck' ? 'text-accent-secondary' : 'text-accent-danger'}`}>
              {p.kind === 'paycheck' ? '+' : '−'}{formatCurrency(p.amount)}
            </span>
            {!p.undone && (
              <button onClick={() => handleUndo(p)} disabled={busy === p.id}
                className="shrink-0 flex items-center gap-1 text-[11px] font-semibold border border-border-color text-text-secondary rounded-lg px-2 py-1 disabled:opacity-50">
                <Undo2 size={11} /> {busy === p.id ? '…' : 'Undo'}
              </button>
            )}
          </div>
        ))}
      </div>
      {recent.length > limit && (
        <button onClick={() => setShowAll((v) => !v)} className="text-accent-primary text-xs mt-1">
          {showAll ? 'Show less' : `Show all (${recent.length})`}
        </button>
      )}
    </div>
  )
}
