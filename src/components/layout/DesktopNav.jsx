import { NavLink } from 'react-router-dom'
import { useRoleStore } from '../../stores/useRoleStore'
import { PRIMARY, SECONDARY, visibleFor } from './navItems'

function Item({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isActive ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
        }`
      }
    >
      {({ isActive }) => (<><Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />{label}</>)}
    </NavLink>
  )
}

// Fixed left sidebar on tablet/desktop widths (md and up).
export default function DesktopNav() {
  const role = useRoleStore((s) => s.role)
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border-color bg-bg-secondary overflow-y-auto">
      <nav className="p-3 space-y-1">
        {visibleFor(PRIMARY, role).map((i) => <Item key={i.to} {...i} />)}
      </nav>
      <p className="px-6 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Manage</p>
      <nav className="p-3 pt-0 space-y-1">
        {SECONDARY.map((i) => <Item key={i.to} {...i} />)}
      </nav>
    </aside>
  )
}
