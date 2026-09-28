/**
 * Generic Firestore CRUD helpers for all KOVA collections.
 * All documents are stored under /users/{uid}/{collection}/
 */
import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, query, orderBy, serverTimestamp, where, limit,
  getDoc, setDoc, arrayUnion, runTransaction, writeBatch,
} from 'firebase/firestore'
import { db, auth } from '../firebase'
import { todayISO } from '../lib/dateUtils'

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
    return updateDocById('fixed_expenses', id, { last_paid_date: todayISO() })
  },
  unmarkPaid: (id) => updateDocById('fixed_expenses', id, { last_paid_date: null }),
  markInstallmentPayment: async (id, expense) => {
    const ref = userDoc('fixed_expenses', id)
    const payload = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      const data = snap.data() || {}
      const newRemaining = Math.max(0, (data.remaining_balance ?? data.original_balance ?? 0) - (data.amount ?? expense.amount ?? 0))
      const completed = newRemaining <= 0
      const p = {
        remaining_balance: newRemaining,
        ...(completed ? { completed_at: todayISO() } : {}),
      }
      tx.update(ref, p)
      return p
    })
    return { ...expense, ...payload }
  },
}

// ── Income ───────────────────────────────────────────────────────────────────

export const incomeService = {
  getSources: () => fetchAll('income_sources'),
  createSource: (data) => createDoc('income_sources', data),
  updateSource: (id, data) => updateDocById('income_sources', id, data),
  removeSource: (id) => deleteDocById('income_sources', id),
}

// ── Credit Cards ──────────────────────────────────────────────────────────────

export const creditService = {
  getAll:   () => fetchAll('credit_cards'),
  create:   (data) => createDoc('credit_cards', data),
  update:   (id, data) => updateDocById('credit_cards', id, data),
  remove:   (id) => deleteDocById('credit_cards', id),
  markPaid: async (id, card, amount) => {
    const ref = userDoc('credit_cards', id)
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      const data = snap.data() || {}
      const newBalance = Math.max(0, (data.current_balance ?? 0) - amount)
      const newAvail   = (data.credit_limit ?? 0) - newBalance
      const p = { current_balance: newBalance, available_credit: newAvail, last_paid_date: todayISO() }
      tx.update(ref, p)
      return p
    })
    return { ...card, ...result }
  },
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export const goalService = {
  getAll:    () => fetchAll('goals'),
  create:    (data) => createDoc('goals', data),
  update:    (id, data) => updateDocById('goals', id, data),
  remove:    (id) => deleteDocById('goals', id),
  addContrib: async (id, goal, amount) => {
    const ref = userDoc('goals', id)
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      const data = snap.data() || {}
      const newCurrent = (data.current_amount ?? 0) + amount
      const completed  = newCurrent >= (data.target_amount ?? goal.target_amount ?? Infinity)
      const p = { current_amount: newCurrent, ...(completed ? { is_completed: true } : {}) }
      tx.update(ref, p)
      return p
    })
    return { ...goal, ...result }
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
      date: todayISO(),
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
  // Atomic transfer: both balance updates + the transfer/history log entries
  // land in a single transaction, so a mid-way failure can never move money
  // out of one account without crediting the other.
  transfer: async (fromId, toId, amount, note) => {
    const fromRef      = userDoc('accounts', fromId)
    const toRef        = userDoc('accounts', toId)
    const transferRef  = doc(userCol('transfers'))
    const historyRef   = doc(userCol('history'))
    return runTransaction(db, async (tx) => {
      const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)])
      if (!fromSnap.exists() || !toSnap.exists()) throw new Error('Account not found')
      const fromData = fromSnap.data()
      const toData   = toSnap.data()
      const newFromBal = Math.round(((fromData.current_balance ?? 0) - amount) * 100) / 100
      const newToBal   = Math.round(((toData.current_balance ?? 0) + amount) * 100) / 100
      tx.update(fromRef, { current_balance: newFromBal, updated_at: serverTimestamp() })
      tx.update(toRef,   { current_balance: newToBal,   updated_at: serverTimestamp() })
      tx.set(transferRef, {
        from_account_id: fromId, to_account_id: toId,
        from_account_name: fromData.name, to_account_name: toData.name,
        amount, note: note || null, date: todayISO(), created_at: serverTimestamp(),
      })
      tx.set(historyRef, {
        type: 'transfer',
        description: `Transferred $${amount.toFixed(2)} from ${fromData.name} to ${toData.name}${note ? ` — ${note}` : ''}`,
        amount, meta: { from_account_id: fromId, to_account_id: toId },
        date: todayISO(), created_at: serverTimestamp(),
      })
      return { newFromBal, newToBal }
    })
  },
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
      share_parts: 1,
      created_at: serverTimestamp(),
    })
    return hid
  },
  addMember: async (hid, uid) => {
    await updateDoc(doc(db, 'households', hid), { member_uids: arrayUnion(uid) })
  },
  setShareParts: async (hid, parts) => {
    await updateDoc(doc(db, 'households', hid), { share_parts: parts })
  },
  getSharedExpenses: async (hid) => {
    const q = query(collection(db, 'households', hid, 'shared_expenses'), orderBy('name', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },
  syncExpenses: async (hid, expenses) => {
    const colRef = collection(db, 'households', hid, 'shared_expenses')
    const existing = await getDocs(colRef)
    const batch = writeBatch(db)
    existing.docs.forEach((d) => batch.delete(d.ref))
    expenses.forEach((e) => {
      batch.set(doc(colRef), {
        name:         e.name,
        total_amount: e.amount || 0,
        due_day:      e.due_day ?? null,
        due_type:     e.due_type ?? 'monthly',
        category:     e.category ?? 'other',
        is_active:    e.is_active !== false && e.is_active !== 0,
        created_at:   serverTimestamp(),
      })
    })
    await batch.commit()
  },
}

// ── Invites ───────────────────────────────────────────────────────────────────

export const inviteService = {
  create: async (ownerUid, householdId, invitedEmail = null, contributorId = null, contributorName = null) => {
    const token = generateId()
    await setDoc(doc(db, 'invites', token), {
      owner_uid:        ownerUid,
      household_id:     householdId,
      invited_email:    invitedEmail ? invitedEmail.trim().toLowerCase() : null,
      contributor_id:   contributorId,
      contributor_name: contributorName,
      created_at:       serverTimestamp(),
      expires_at:       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      used:             false,
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
