import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import UnlockScreen from './pages/UnlockScreen'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import Credit from './pages/Credit'
import Goals from './pages/Goals'
import Chat from './pages/Chat'
import History from './pages/History'
import Household from './pages/Household'
import Toast from './components/shared/Toast'

function PrivateRoute({ children }) {
  const unlocked = useAuthStore((s) => s.unlocked)
  const loading  = useAuthStore((s) => s.loading)
  if (loading) return <div className="h-full bg-bg-primary flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
  </div>
  return unlocked ? children : <Navigate to="/unlock" replace />
}

export default function App() {
  const { init } = useAuthStore()

  useEffect(() => { init() }, [init])

  return (
    <HashRouter>
      <Toast />
      <Routes>
        <Route path="/unlock" element={<UnlockScreen />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="income"   element={<Income />} />
          <Route path="credit"   element={<Credit />} />
          <Route path="goals"    element={<Goals />} />
          <Route path="chat"     element={<Chat />} />
          <Route path="history"   element={<History />} />
          <Route path="household" element={<Household />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
