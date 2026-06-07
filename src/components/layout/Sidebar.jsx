import { NavLink } from 'react-router-dom'
import { X, ReceiptText, CreditCard, Target, Clock } from 'lucide-react'

const ITEMS = [
  { to: '/expenses', label: 'Expenses', Icon: ReceiptText },
  { to: '/credit',   label: 'Credit',   Icon: CreditCard },
  { to: '/goals',    label: 'Goals',    Icon: Target },
  { to: '/history',  label: 'History',  Icon: Clock },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-full w-64 bg-bg-secondary border-l border-border-color flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border-color shrink-0">
          <p className="text-text-primary font-semibold font-display">More</p>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-sm font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}
