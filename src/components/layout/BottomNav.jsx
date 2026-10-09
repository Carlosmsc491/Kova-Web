import { NavLink } from 'react-router-dom'
import { useRoleStore } from '../../stores/useRoleStore'
import { PRIMARY, visibleFor } from './navItems'

// Phones only — wider screens get the DesktopNav sidebar instead.
export default function BottomNav() {
  const role = useRoleStore((s) => s.role)
  const TABS = visibleFor(PRIMARY, role)
  return (
    <nav className="md:hidden shrink-0 bg-bg-secondary border-t border-border-color safe-bottom">
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all active:scale-90 min-w-[52px] ${
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
