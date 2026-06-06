import { useToastStore } from '../../stores/useToastStore'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
}
const COLORS = {
  success: 'border-accent-secondary/30 bg-accent-secondary/10 text-accent-secondary',
  error:   'border-accent-danger/30 bg-accent-danger/10 text-accent-danger',
  info:    'border-accent-primary/30 bg-accent-primary/10 text-accent-primary',
}

export default function Toast() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] ?? Info
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-sm font-medium shadow-lg pointer-events-auto max-w-sm w-full ${COLORS[t.type] ?? COLORS.info}`}
          >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
