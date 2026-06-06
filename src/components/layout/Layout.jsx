import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

export default function Layout() {
  const { pathname } = useLocation()
  const isChat = pathname === '/chat'

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      <TopBar />
      {isChat ? (
        // Chat gets a raw flex column without padding, managing its own layout
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 max-w-2xl w-full mx-auto flex flex-col px-4 py-0 overflow-hidden">
            <Outlet />
          </div>
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-5 max-w-2xl mx-auto pb-6">
            <Outlet />
          </div>
        </main>
      )}
      <BottomNav />
    </div>
  )
}
