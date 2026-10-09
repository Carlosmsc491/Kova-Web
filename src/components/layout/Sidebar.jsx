import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { SECONDARY } from './navItems'

// The less-used setup screens; the daily ones are in the bottom tabs.
const ITEMS = SECONDARY

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 animate-fade-in"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-full w-64 bg-bg-secondary border-l border-border-color flex flex-col transition-transform duration-300 safe-top safe-bottom ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border-color shrink-0">
          <p className="text-text-primary font-semibold font-display">More</p>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary active:scale-90 rounded-lg transition-all">
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
                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-95 ${
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
