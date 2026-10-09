import {
  LayoutDashboard, TrendingUp, ReceiptText, CreditCard, MessageCircle, Settings,
  Landmark, DollarSign, Target, Home, Clock,
} from 'lucide-react'

// Ordered by how often they're used: the daily screens get the bottom tabs
// (and the top of the desktop sidebar); setup screens live under "More".
export const PRIMARY = [
  { to: '/',          label: 'Home',      Icon: LayoutDashboard },
  { to: '/cashflow',  label: 'Cash Flow', Icon: TrendingUp },
  { to: '/expenses',  label: 'Expenses',  Icon: ReceiptText },
  { to: '/credit',    label: 'Cards',     Icon: CreditCard },
  { to: '/chat',      label: 'Chat',      Icon: MessageCircle },
]

export const SECONDARY = [
  { to: '/accounts',  label: 'Accounts',  Icon: Landmark },
  { to: '/income',    label: 'Income',    Icon: DollarSign },
  { to: '/goals',     label: 'Goals',     Icon: Target },
  { to: '/household', label: 'Household', Icon: Home },
  { to: '/history',   label: 'History',   Icon: Clock },
  { to: '/settings',  label: 'Settings',  Icon: Settings },
]

// Household members don't get the AI chat.
export const visibleFor = (items, role) => items.filter((t) => !(t.to === '/chat' && role === 'member'))
