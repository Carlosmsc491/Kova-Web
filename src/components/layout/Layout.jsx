import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import DesktopNav from './DesktopNav'
import ErrorBoundary from '../shared/ErrorBoundary'
import { usePaymentStore } from '../../stores/usePaymentStore'
import { useRoleStore } from '../../stores/useRoleStore'
import { toast } from '../../stores/useToastStore'

export default function Layout() {
  const { pathname } = useLocation()
  const isChat = pathname === '/chat'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const role = useRoleStore((s) => s.role)

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
    </div>
  )
}
