import { useEffect, useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import DesktopNav from './DesktopNav'
import ErrorBoundary from '../shared/ErrorBoundary'
import SetPinModal from '../shared/SetPinModal'
import { usePaymentStore } from '../../stores/usePaymentStore'
import { useRoleStore } from '../../stores/useRoleStore'
import { toast } from '../../stores/useToastStore'

export default function Layout() {
  const { pathname } = useLocation()
  const isChat = pathname === '/chat'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const role = useRoleStore((s) => s.role)
  // Re-evaluated when the user object changes (e.g. right after linking Google).
  useAuthStore((s) => s.user)
  const needsGoogleLink = useAuthStore.getState().needsGoogleLink()
  // After a PIN lockout, Google sign-in brings you here: set a new PIN.
  const [newPinOpen, setNewPinOpen] = useState(() => useAuthStore.getState().needsNewPin())

  // Payday: credit any paycheck that has come due to its deposit account.
  useEffect(() => {
    if (role === 'member') return
    usePaymentStore.getState().autoReceivePaychecks().then((n) => {
      if (n > 0) toast.success(n === 1 ? 'Paycheck added to your account' : `${n} paychecks added to your account`)
    })
  }, [role])

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      <TopBar onMenuOpen={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {needsGoogleLink && (
        <Link to="/settings"
          className="shrink-0 bg-accent-warning/15 border-b border-accent-warning/30 text-text-primary text-xs px-4 py-2 flex items-center gap-2">
          <ShieldAlert size={14} className="text-accent-warning shrink-0" />
          <span>Your account still signs in with a PIN that can be guessed. <b>Tap to secure it with Google</b> — 1 minute.</span>
        </Link>
      )}
      <div className="flex-1 min-h-0 flex">
        <DesktopNav />
        {isChat ? (
          // Chat gets a raw flex column without padding, managing its own layout
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 max-w-2xl w-full mx-auto flex flex-col px-4 py-0 overflow-hidden">
              <ErrorBoundary key={pathname}><Outlet /></ErrorBoundary>
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 py-5 max-w-2xl mx-auto pb-6">
              <ErrorBoundary key={pathname}><Outlet /></ErrorBoundary>
            </div>
          </main>
        )}
      </div>
      <BottomNav />
      <SetPinModal open={newPinOpen}
        onClose={() => { useAuthStore.getState().clearNeedsNewPin(); setNewPinOpen(false) }}
        onSet={async (pin) => { await useAuthStore.getState().setDevicePin(pin); toast.success('New PIN set for this device') }} />
    </div>
  )
}
