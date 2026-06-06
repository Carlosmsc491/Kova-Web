export function todayISO() {
  return toISO(new Date())
}

export function toISO(d) {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysUntil(isoDateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = parseISO(isoDateStr)
  return Math.round((target - today) / 86_400_000)
}

export function getNextPaycheckDates(lastPaycheckISO, count = 6) {
  const last = parseISO(lastPaycheckISO)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(last)
    d.setDate(d.getDate() + 14 * (i + 1))
    return toISO(d)
  })
}

export function getNextPaycheckDate(lastPaycheckISO) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const last = parseISO(lastPaycheckISO)
  let n = 1
  while (true) {
    const c = new Date(last)
    c.setDate(c.getDate() + 14 * n)
    if (c >= today) return toISO(c)
    n++
  }
}

export function isTypicalJob2Day(dayOfWeek) {
  return dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6
}

export function buildMonthGrid(year, monthIndex) {
  const firstDay   = new Date(year, monthIndex, 1)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const startPad   = firstDay.getDay()
  const cells      = Array(startPad).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIndex, d)
    cells.push({ date: toISO(date), day: d, weekday: date.getDay() })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function formatMonthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}
