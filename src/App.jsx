import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore }    from './stores/useAuthStore'
import { useRoleStore }    from './stores/useRoleStore'
import UnlockScreen        from './pages/UnlockScreen'
import JoinHousehold       from './pages/JoinHousehold'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import Credit from './pages/Credit'
import Goals from './pages/Goals'
import Chat from './pages/Chat'
import History from './pages/History'
import Household from './pages/Household'
import Accounts from './pages/Accounts'
import CashFlow from './pages/CashFlow'
import Settings from './pages/Settings'
import Toast from './components/shared/Toast'

const Spinner = () => (
  <div className="h-full bg-bg-primary flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
  </div>
)

// A Google login that isn't the owner or an invited member.
function NoAccess() {
  const user    = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  return (
    <div className="h-full bg-bg-primary flex flex-col items-center justify-center px-8 text-center gap-3">
      <p className="text-text-primary font-semibold">This account doesn't have access</p>
      <p className="text-text-muted text-sm max-w-xs">{user?.email} isn't allowed in this Kova. Ask the owner for an invite link.</p>
      <button onClick={signOut} className="mt-2 bg-accent-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold">Sign out</button>
    </div>
  )
}

function PrivateRoute({ children }) {
  const unlocked = useAuthStore((s) => s.unlocked)
  const loading  = useAuthStore((s) => s.loading)
  const role     = useRoleStore((s) => s.role)
  const roleReady = useRoleStore((s) => s.loaded)
  if (loading) return <Spinner />
  if (!unlocked) return <Navigate to="/unlock" replace />
  if (!roleReady || role === null) return <Spinner />
  if (role === 'denied') return <NoAccess />
  return children
}

export default function App() {
  const { init }   = useAuthStore()
  const user       = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const initRole   = useRoleStore((s) => s.init)

  useEffect(() => { init() }, [init])

  useEffect(() => {
    if (!authLoading) initRole(user?.uid ?? null)
  }, [user, authLoading, initRole])

  return (
    <HashRouter>
      <Toast />
      <Routes>
        <Route path="/unlock" element={<UnlockScreen />} />
        <Route path="/join"   element={<JoinHousehold />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="income"   element={<Income />} />
          <Route path="credit"   element={<Credit />} />
          <Route path="goals"    element={<Goals />} />
          <Route path="chat"     element={<Chat />} />
          <Route path="history"   element={<History />} />
          <Route path="household" element={<Household />} />
          <Route path="accounts"  element={<Accounts />} />
          <Route path="cashflow"  element={<CashFlow />} />
          <Route path="settings"  element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
