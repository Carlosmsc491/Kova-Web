/**
 * Generic Firestore CRUD helpers for all KOVA collections.
 * All documents are stored under /users/{uid}/{collection}/
 */
import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, query, orderBy, serverTimestamp, where, limit,
  getDoc, setDoc, arrayUnion, runTransaction, writeBatch, deleteField,
} from 'firebase/firestore'
import { db, auth } from '../firebase'
import { todayISO, firstUnpaidOccurrence } from '../lib/dateUtils'

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
  // Local stand-in for the server timestamp, so "last updated" reads fresh
  // without a refetch.
  return { id, ...data, updated_at: new Date() }
}

// Applies `delta` to an account's balance inside an existing transaction.
// Reads must come before writes in a Firestore transaction, so callers get the
// read half and the write half separately.
async function readAccount(tx, accountId) {
  if (!accountId) return null
  const ref  = userDoc('accounts', accountId)
  const snap = await tx.get(ref)
  return snap.exists() ? { ref, data: snap.data() } : null
}
function writeAccountDelta(tx, acct, delta) {
  if (!acct) return null
  const newBal = Math.round(((acct.data.current_balance ?? 0) + delta) * 100) / 100
  tx.update(acct.ref, { current_balance: newBal, updated_at: serverTimestamp() })
  return newBal
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

// ── Payments ledger ───────────────────────────────────────────────────────────
// Every money movement (bill paid, card paid, paycheck received) is one
// transaction that updates the item, moves the money between account/card,
// and writes a /payments record holding what it changed — so Undo can put
// every piece back exactly. The AI's tools (functions/index.js) write the
// same record shape.
//
// Record: { kind: 'expense'|'card'|'paycheck', target_id, target_name, amount,
//           source_type: 'account'|'card'|'none', source_id, source_name,
//           due_date, date, auto, undone, prev: {...}, created_at }

const round2 = (n) => Math.round(n * 100) / 100

async function readSource(tx, type, id) {
  if (type === 'account') return readAccount(tx, id)
  if (type === 'card' && id) {
    const ref  = userDoc('credit_cards', id)
    const snap = await tx.get(ref)
    return snap.exists() ? { ref, data: snap.data() } : null
  }
  return null
}

// Money leaving the user: an account goes down, a card's balance goes up.
// `sign` = -1 reverses it (refund on Undo).
function chargeSource(tx, type, src, amount, sign = 1) {
  if (!src) return
  if (type === 'account') {
    writeAccountDelta(tx, src, -amount * sign)
  } else if (type === 'card') {
    const bal = Math.max(0, round2((src.data.current_balance ?? 0) + amount * sign))
    tx.update(src.ref, { current_balance: bal, available_credit: (src.data.credit_limit ?? 0) - bal, updated_at: serverTimestamp() })
  }
}

function writeRecord(tx, rec, historyText) {
  const ref = doc(userCol('payments'))
  tx.set(ref, { ...rec, date: todayISO(), undone: false, created_at: serverTimestamp() })
  tx.set(doc(userCol('history')), {
    type: `payment_${rec.kind}`, description: historyText, amount: rec.amount,
    meta: { payment_id: ref.id }, date: todayISO(), created_at: serverTimestamp(),
  })
  return ref.id
}

export const paymentService = {
  recent: async (n = 20) => {
    const q = query(userCol('payments'), orderBy('created_at', 'desc'), limit(n))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },

  // Pay one occurrence of a bill. `dueDate` defaults to the earliest unpaid
  // one. source: { type: 'account'|'card'|'none', id }.
  payExpense: (expenseId, { amount, source, dueDate }) => runTransaction(db, async (tx) => {
    const ref = userDoc('fixed_expenses', expenseId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Expense not found')
    const exp = snap.data()
    const src = await readSource(tx, source.type, source.id)
    const due = dueDate || firstUnpaidOccurrence(exp)
    const isLoan = exp.expense_type === 'installment'
    const remaining = isLoan ? Math.max(0, round2((exp.remaining_balance ?? exp.original_balance ?? 0) - amount)) : null

    chargeSource(tx, source.type, src, amount)
    tx.update(ref, {
      paid_through: due,
      last_paid_date: todayISO(),
      default_pay_source: { type: source.type, id: source.id ?? null },
      ...(isLoan ? { remaining_balance: remaining, ...(remaining <= 0 ? { completed_at: todayISO() } : {}) } : {}),
      updated_at: serverTimestamp(),
    })
    const id = writeRecord(tx, {
      kind: 'expense', target_id: expenseId, target_name: exp.name, amount,
      source_type: source.type, source_id: source.id ?? null, source_name: src?.data.name ?? null,
      due_date: due, auto: false,
      prev: {
        paid_through: exp.paid_through ?? null, last_paid_date: exp.last_paid_date ?? null,
        ...(isLoan ? { remaining_balance: exp.remaining_balance ?? null, completed_at: exp.completed_at ?? null } : {}),
      },
    }, `Paid ${exp.name}${src ? ` from ${src.data.name}` : ''}`)
    return { id, completed: isLoan && remaining <= 0 }
  }),

  // Pay a credit card from a bank account (or 'none' if the bank balance was
  // already updated). A payment of at least the minimum covers the next due date.
  payCard: (cardId, { amount, source }) => runTransaction(db, async (tx) => {
    const ref = userDoc('credit_cards', cardId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Card not found')
    const card = snap.data()
    const src = source.type === 'account' ? await readAccount(tx, source.id) : null
    const newBal = Math.max(0, round2((card.current_balance ?? 0) - amount))
    const coversMin = amount >= (card.minimum_payment ?? 0) || newBal === 0
    const due = coversMin && card.payment_due_date
      ? firstUnpaidOccurrence({ ...card, due_type: 'monthly', due_day: card.payment_due_date })
      : card.paid_through ?? null

    if (src) writeAccountDelta(tx, src, -amount)
    tx.update(ref, {
      current_balance: newBal, available_credit: (card.credit_limit ?? 0) - newBal,
      last_paid_date: todayISO(), paid_through: due, updated_at: serverTimestamp(),
    })
    const id = writeRecord(tx, {
      kind: 'card', target_id: cardId, target_name: card.name, amount,
      source_type: src ? 'account' : 'none', source_id: src ? source.id : null, source_name: src?.data.name ?? null,
      due_date: due, auto: false,
      prev: { current_balance: card.current_balance ?? 0, paid_through: card.paid_through ?? null, last_paid_date: card.last_paid_date ?? null },
    }, `Paid ${card.name}${src ? ` from ${src.data.name}` : ''}`)
    return { id }
  }),

  // Paycheck for `payDate` arrived. Idempotent: if that date is already
  // recorded (another tab, or auto-credit already ran) nothing happens.
  receivePaycheck: (sourceId, { payDate, accountId, auto = false }) => runTransaction(db, async (tx) => {
    const ref = userDoc('income_sources', sourceId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Income source not found')
    const job = snap.data()
    if (job.last_paycheck_date && job.last_paycheck_date >= payDate) return { id: null, skipped: true }
    const acct = await readAccount(tx, accountId)
    const amount = Number(job.amount_per_period) || 0

    if (acct) writeAccountDelta(tx, acct, amount)
    tx.update(ref, { last_paycheck_date: payDate, updated_at: serverTimestamp() })
    const id = writeRecord(tx, {
      kind: 'paycheck', target_id: sourceId, target_name: job.name || 'Paycheck', amount,
      source_type: acct ? 'account' : 'none', source_id: acct ? accountId : null, source_name: acct?.data.name ?? null,
      due_date: payDate, auto,
      prev: { last_paycheck_date: job.last_paycheck_date ?? null },
    }, `Paycheck ${payDate}${acct ? ` added to ${acct.data.name}` : ''}`)
    return { id }
  }),

  // Reverses a recorded payment: money goes back, and the item's due-date
  // state is restored if nothing newer has changed it since.
  undo: (paymentId) => runTransaction(db, async (tx) => {
    const pRef = userDoc('payments', paymentId)
    const pSnap = await tx.get(pRef)
    if (!pSnap.exists()) throw new Error('Payment not found')
    const p = pSnap.data()
    if (p.undone) return { already: true }

    const col = { expense: 'fixed_expenses', card: 'credit_cards', paycheck: 'income_sources' }[p.kind]
    const tRef = userDoc(col, p.target_id)
    const tSnap = await tx.get(tRef)
    const target = tSnap.exists() ? tSnap.data() : null
    const src = await readSource(tx, p.source_type, p.source_id)

    if (p.kind === 'expense') {
      chargeSource(tx, p.source_type, src, p.amount, -1)
      if (target) {
        const patch = { updated_at: serverTimestamp() }
        if (target.paid_through === p.due_date) {
          patch.paid_through   = p.prev.paid_through
          patch.last_paid_date = p.prev.last_paid_date
        }
        if ('remaining_balance' in p.prev) {
          patch.remaining_balance = round2((target.remaining_balance ?? 0) + p.amount)
          patch.completed_at = p.prev.completed_at ?? deleteField()
        }
        tx.update(tRef, patch)
      }
    } else if (p.kind === 'card') {
      if (src) writeAccountDelta(tx, src, p.amount)
      if (target) {
        const bal = round2((target.current_balance ?? 0) + p.amount)
        tx.update(tRef, {
          current_balance: bal, available_credit: (target.credit_limit ?? 0) - bal,
          ...(target.paid_through === p.due_date ? { paid_through: p.prev.paid_through, last_paid_date: p.prev.last_paid_date } : {}),
          updated_at: serverTimestamp(),
        })
      }
    } else if (p.kind === 'paycheck') {
      if (src) writeAccountDelta(tx, src, -p.amount)
      if (target && target.last_paycheck_date === p.due_date) {
        tx.update(tRef, { last_paycheck_date: p.prev.last_paycheck_date, updated_at: serverTimestamp() })
      }
    }

    tx.update(pRef, { undone: true, undone_at: serverTimestamp() })
    tx.set(doc(userCol('history')), {
      type: 'payment_undo', description: `Undid: ${p.target_name}`, amount: p.amount,
      meta: { payment_id: paymentId }, date: todayISO(), created_at: serverTimestamp(),
    })
    return { kind: p.kind }
  }),
}

// ── AI insights (cached reviews) ──────────────────────────────────────────────
// One doc per insight kind. `hash` identifies the data the review was made
// from, so the page only pays for a new review when something changed.

export const insightService = {
  get: async (kind) => {
    const snap = await getDoc(userDoc('ai_insights', kind))
    return snap.exists() ? snap.data() : null
  },
  set: (kind, hash, result) =>
    setDoc(userDoc('ai_insights', kind), { hash, result, created_at: serverTimestamp() }),
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

// Invite tokens and household ids act as secrets — use the CSPRNG, not Math.random.
function generateId(length = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
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
}
