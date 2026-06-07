import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Clock, ReceiptText, Sun, Moon, Menu } from 'lucide-react'
import { useThemeStore } from '../../stores/useThemeStore'

const TITLES = {
  '/':          'Dashboard',
  '/expenses':  'Expenses',
  '/income':    'Income',
  '/credit':    'Credit',
  '/goals':     'Goals',
  '/accounts':  'Accounts',
  '/chat':      'AI Assistant',
  '/history':   'History',
  '/household': 'Household',
  '/cashflow':  'Cash Flow',
}

export default function TopBar({ onMenuOpen }) {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const title        = TITLES[pathname] ?? 'KOVA'
  const isHome       = pathname === '/'
  const { theme, toggle } = useThemeStore()

  return (
    <header className="shrink-0 bg-bg-secondary border-b border-border-color px-4 flex items-center justify-between h-14">
      <div className="flex items-center gap-3">
        {!isHome && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1 text-text-muted hover:text-text-primary rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {isHome && (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-primary to-purple-800 flex items-center justify-center">
            <span className="text-white text-sm font-bold font-display">K</span>
          </div>
        )}
        <h1 className="text-text-primary font-semibold font-display">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-tertiary transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {isHome && (
          <>
            <button
              onClick={() => navigate('/expenses')}
              className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-tertiary transition-colors"
              title="Expenses"
            >
              <ReceiptText size={18} />
            </button>
            <button
              onClick={() => navigate('/history')}
              className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-tertiary transition-colors"
              title="History"
            >
              <Clock size={18} />
            </button>
          </>
        )}
        <button
          onClick={onMenuOpen}
          className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-tertiary transition-colors"
          title="More"
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  )
}
