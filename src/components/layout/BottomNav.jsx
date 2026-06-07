import { NavLink } from 'react-router-dom'
import { LayoutDashboard, DollarSign, Home, Landmark, MessageCircle } from 'lucide-react'

const TABS = [
  { to: '/',          label: 'Home',      Icon: LayoutDashboard },
  { to: '/income',    label: 'Income',    Icon: DollarSign },
  { to: '/household', label: 'Household', Icon: Home },
  { to: '/accounts',  label: 'Accounts',  Icon: Landmark },
  { to: '/chat',      label: 'Chat',      Icon: MessageCircle },
]

export default function BottomNav() {
  return (
    <nav className="shrink-0 bg-bg-secondary border-t border-border-color safe-bottom">
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[52px] ${
                isActive
                  ? 'text-accent-primary'
                  : 'text-text-muted active:text-text-secondary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
