// Server copy of the due-date helpers in src/lib/dateUtils.js — the Cloud
// Functions package can't import the web app's ES modules. Keep the two in
// sync: paying covers one specific due date (paid_through), not a month.

const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / 86400000);

function monthlyDueDate(year, month, dueDay) {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(dueDay || 1, last));
}

function effectivePaidThrough(item) {
  if (item.paid_through) return item.paid_through;
  if (!item.last_paid_date) return null;
  const paid = parseISO(item.last_paid_date);
  switch (item.due_type) {
    case "one-time": return item.due_date || item.last_paid_date;
    case "biweekly": return item.last_paid_date;
    case "weekly":   return toISO(addDays(paid, (item.due_day ?? 1) - paid.getDay()));
    default:         return toISO(monthlyDueDate(paid.getFullYear(), paid.getMonth(), item.due_day));
  }
}

function nextOccurrenceAfter(item, iso) {
  const after = parseISO(iso);
  switch (item.due_type) {
    case "one-time":
      return item.due_date && item.due_date > iso ? item.due_date : null;
    case "weekly": {
      const diff = ((item.due_day ?? 1) - after.getDay() + 7) % 7 || 7;
      return toISO(addDays(after, diff));
    }
    case "biweekly": {
      const paid = effectivePaidThrough(item);
      const anchor = paid || item.due_date;
      if (!anchor) return null;
      const base = parseISO(anchor);
      let k = paid ? 1 : 0;
      const gap = daysBetween(base, after);
      if (gap >= 0) k = Math.max(k, Math.floor(gap / 14) + 1);
      return toISO(addDays(base, 14 * k));
    }
    default: {
      let d = monthlyDueDate(after.getFullYear(), after.getMonth(), item.due_day);
      if (d <= after) d = monthlyDueDate(after.getFullYear(), after.getMonth() + 1, item.due_day);
      return toISO(d);
    }
  }
}

function firstUnpaidOccurrence(item, today) {
  const paid = effectivePaidThrough(item);
  if (paid) return nextOccurrenceAfter(item, paid);
  const t = parseISO(today);
  switch (item.due_type) {
    case "one-time": return item.due_date || null;
    case "monthly":  return toISO(monthlyDueDate(t.getFullYear(), t.getMonth(), item.due_day));
    default:         return nextOccurrenceAfter(item, toISO(addDays(t, -1)));
  }
}

module.exports = { firstUnpaidOccurrence };
