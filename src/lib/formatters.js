const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const formatCurrency = (amount) => usd.format(amount ?? 0)
export const formatCurrencyCompact = (amount) => usdCompact.format(amount ?? 0)

export const formatDate = (isoString) => {
  if (!isoString) return '—'
  const d = new Date(isoString + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatPercent = (value) => `${(value ?? 0).toFixed(1)}%`

export function ordinal(n) {
  const v = n % 100
  return n + (['th','st','nd','rd'][(v-20)%10] || ['th','st','nd','rd'][v] || 'th')
}
