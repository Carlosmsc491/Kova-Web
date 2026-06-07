/**
 * Generic Firestore CRUD helpers for all KOVA collections.
 * All documents are stored under /users/{uid}/{collection}/
 */
import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, query, orderBy, serverTimestamp, where, limit,
  getDoc, setDoc, arrayUnion,
} from 'firebase/firestore'
import { db, auth } from '../firebase'

function uid() {
  return auth.currentUser?.uid
}

export function userCol(col) {
  return collection(db, 'users', uid(), col)
}

export function userDoc(col, id) {
  return doc(db, 'users', uid(), col, id)
}

// ── Generic helpers ──────────────────────────────────────────────────────────

export async function fetchAll(col, orderField = 'created_at') {
  const q = query(userCol(col), orderBy(orderField, 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function fetchWhere(col, field, op, value) {
  const q = query(userCol(col), where(field, op, value))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createDoc(col, data) {
  const ref = await addDoc(userCol(col), { ...data, created_at: serverTimestamp() })
  return { id: ref.id, ...data }
}

export async function updateDocById(col, id, data) {
  await updateDoc(userDoc(col, id), { ...data, updated_at: serverTimestamp() })
  return { id, ...data }
}

export async function deleteDocById(col, id) {
  await deleteDoc(userDoc(col, id))
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export const expenseService = {
  getAll:  () => fetchAll('fixed_expenses'),
  create:  (data) => createDoc('fixed_expenses', data),
  update:  (id, data) => updateDocById('fixed_expenses', id, data),
  remove:  (id) => deleteDocById('fixed_expenses', id),
  toggle:  async (id, currentActive) => {
    const newActive = currentActive === false || currentActive === 0 ? true : false
    await updateDocById('fixed_expenses', id, { is_active: newActive })
    return { id, is_active: newActive }
  },
  markPaid: async (id) => {
    const today = new Date().toISOString().split('T')[0]
    return updateDocById('fixed_expenses', id, { last_paid_date: today })
  },
  unmarkPaid: (id) => updateDocById('fixed_expenses', id, { last_paid_date: null }),
  markInstallmentPayment: async (id, expense) => {
    const newRemaining = Math.max(0, (expense.remaining_balance || expense.original_balance || 0) - expense.amount)
    const completed = newRemaining <= 0
    const payload = {
      remaining_balance: newRemaining,
      ...(completed ? { completed_at: new Date().toISOString().split('T')[0] } : {}),
    }
    await updateDocById('fixed_expenses', id, payload)
    return { ...expense, ...payload }
  },
}

// ── Income ───────────────────────────────────────────────────────────────────

export const incomeService = {
  getSources: () => fetchAll('income_sources'),
  createSource: (data) => createDoc('income_sources', data),
  updateSource: (id, data) => updateDocById('income_sources', id, data),
  removeSource: (id) => deleteDocById('income_sources', id),
  getJob2Days: (sourceId) => fetchWhere('job2_days', 'income_source_id', '==', sourceId),
  logDay: (data) => createDoc('job2_days', { ...data, paid: false }),
  unlogDay: (id) => deleteDocById('job2_days', id),
  markAllPaid: async (sourceId) => {
    const days = await fetchWhere('job2_days', 'income_source_id', '==', sourceId)
    const unpaid = days.filter((d) => !d.paid)
    await Promise.all(unpaid.map((d) => updateDocById('job2_days', d.id, { paid: true, paycheck_date: new Date().toISOString().split('T')[0] })))
    return unpaid.length
  },
}

// ── Credit Cards ──────────────────────────────────────────────────────────────

export const creditService = {
  getAll:   () => fetchAll('credit_cards'),
  create:   (data) => createDoc('credit_cards', data),
  update:   (id, data) => updateDocById('credit_cards', id, data),
  remove:   (id) => deleteDocById('credit_cards', id),
  markPaid: async (id, card, amount) => {
    const newBalance = Math.max(0, (card.current_balance || 0) - amount)
    const newAvail   = (card.credit_limit || 0) - newBalance
    await updateDocById('credit_cards', id, {
      current_balance:  newBalance,
      available_credit: newAvail,
      last_paid_date:   new Date().toISOString().split('T')[0],
    })
    return { ...card, current_balance: newBalance, available_credit: newAvail }
  },
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export const goalService = {
  getAll:    () => fetchAll('goals'),
  create:    (data) => createDoc('goals', data),
  update:    (id, data) => updateDocById('goals', id, data),
  remove:    (id) => deleteDocById('goals', id),
  addContrib: async (id, goal, amount) => {
    const newCurrent = (goal.current_amount || 0) + amount
    const completed  = newCurrent >= goal.target_amount
    await updateDocById('goals', id, {
      current_amount: newCurrent,
      ...(completed ? { is_completed: true } : {}),
    })
    return { ...goal, current_amount: newCurrent, is_completed: completed }
  },
  markComplete: (id) => updateDocById('goals', id, { is_completed: true }),
}

// ── History ───────────────────────────────────────────────────────────────────

export const historyService = {
  getAll:  () => fetchAll('history', 'created_at'),
  log: (type, description, amount, meta = {}) =>
    createDoc('history', {
      type,
      description,
      amount: amount || null,
      meta,
      date: new Date().toISOString().split('T')[0],
    }),
}

// ── Household ─────────────────────────────────────────────────────────────────

export const householdService = {
  getContributors: () => fetchAll('household_contributors'),
  createContributor: (data) => createDoc('household_contributors', data),
  updateContributor: (id, data) => updateDocById('household_contributors', id, data),
  removeContributor: (id) => deleteDocById('household_contributors', id),
  getHead: async () => (await fetchAll('household_settings', 'created_at'))[0] || null,
  setHead: async (headId) => {
    const settings = await fetchAll('household_settings', 'created_at')
    if (settings.length > 0) return updateDocById('household_settings', settings[0].id, { head_id: headId })
    return createDoc('household_settings', { head_id: headId })
  },
}

// ── Accounts (manual) ─────────────────────────────────────────────────────────

export const accountService = {
  getAll:  () => fetchAll('accounts'),
  create:  (data) => createDoc('accounts', data),
  update:  (id, data) => updateDocById('accounts', id, data),
  remove:  (id) => deleteDocById('accounts', id),
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export const transferService = {
  getAll:  () => fetchAll('transfers'),
  create:  (data) => createDoc('transfers', data),
}

// ── Chat History ──────────────────────────────────────────────────────────────

const CHAT_LIMIT = 30

export const chatService = {
  getHistory: async () => {
    // Fetch the most recent CHAT_LIMIT messages in one cheap query
    const q = query(userCol('chat_history'), orderBy('created_at', 'desc'), limit(CHAT_LIMIT))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()
  },
  save: async (role, content) => {
    await createDoc('chat_history', { role, content })
    // Trim old messages so storage never grows beyond CHAT_LIMIT + a small buffer
    const all = await fetchAll('chat_history', 'created_at')
    if (all.length > CHAT_LIMIT + 5) {
      const excess = all.slice(0, all.length - CHAT_LIMIT)
      await Promise.all(excess.map((m) => deleteDocById('chat_history', m.id)))
    }
  },
  clearAll: async () => {
    const msgs = await fetchAll('chat_history', 'created_at')
    await Promise.all(msgs.map((m) => deleteDocById('chat_history', m.id)))
  },
}

// ── User Profile ──────────────────────────────────────────────────────────────

export const profileService = {
  get: async (uid) => {
    const snap = await getDoc(doc(db, 'user_profiles', uid))
    return snap.exists() ? snap.data() : null
  },
  set: (uid, data) => setDoc(doc(db, 'user_profiles', uid), data, { merge: true }),
}

// ── Household document + shared expenses ──────────────────────────────────────

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export const householdDocService = {
  get: async (hid) => {
    const snap = await getDoc(doc(db, 'households', hid))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  },
  create: async (ownerUid) => {
    const hid = generateId()
    await setDoc(doc(db, 'households', hid), {
      owner_uid: ownerUid,
      member_uids: [ownerUid],
      created_at: serverTimestamp(),
    })
    return hid
  },
  addMember: async (hid, uid) => {
    await updateDoc(doc(db, 'households', hid), { member_uids: arrayUnion(uid) })
  },
  getSharedExpenses: async (hid) => {
    const q = query(collection(db, 'households', hid, 'shared_expenses'), orderBy('name', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },
  syncExpenses: async (hid, expenses) => {
    const colRef = collection(db, 'households', hid, 'shared_expenses')
    const existing = await getDocs(colRef)
    await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)))
    await Promise.all(expenses.map((e) =>
      addDoc(colRef, {
        name:         e.name,
        total_amount: e.amount || 0,
        due_day:      e.due_day ?? null,
        due_type:     e.due_type ?? 'monthly',
        category:     e.category ?? 'other',
        is_active:    e.is_active !== false && e.is_active !== 0,
        created_at:   serverTimestamp(),
      })
    ))
  },
}

// ── Invites ───────────────────────────────────────────────────────────────────

export const inviteService = {
  create: async (ownerUid, householdId, invitedEmail = null) => {
    const token = generateId()
    await setDoc(doc(db, 'invites', token), {
      owner_uid:     ownerUid,
      household_id:  householdId,
      invited_email: invitedEmail ? invitedEmail.trim().toLowerCase() : null,
      created_at:    serverTimestamp(),
      expires_at:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      used:          false,
    })
    return token
  },
  get: async (token) => {
    const snap = await getDoc(doc(db, 'invites', token))
    return snap.exists() ? snap.data() : null
  },
  redeem: async (token) => {
    await updateDoc(doc(db, 'invites', token), { used: true })
  },
}
