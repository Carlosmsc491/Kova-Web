import { useState, useEffect } from 'react'
import { Landmark, Plus, Pencil, Trash2, X, ArrowLeftRight, ArrowRight } from 'lucide-react'
import { useAccountStore } from '../stores/useAccountStore'
import { formatCurrency } from '../lib/formatters'
import { toast } from '../stores/useToastStore'

// ─── Account Form ─────────────────────────────────────────────────────────────
const BLANK = { name: '', institution: '', current_balance: '', account_type: 'checking' }

function AccountForm({ initial, onSave, onCancel, saving, isEditing }) {
  const [f, setF] = useState(initial || BLANK)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const inp = 'w-full bg-bg-secondary border border-border-color rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-colors'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    onSave({
      name:            f.name.trim(),
      institution:     f.institution.trim() || null,
      current_balance: parseFloat(f.current_balance) || 0,
      account_type:    f.account_type,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-tertiary border border-accent-primary/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-text-primary font-semibold text-sm">{isEditing ? 'Edit Account' : 'Add Account'}</p>
        <button type="button" onClick={onCancel} className="p-1 text-text-muted hover:text-text-primary">
          <X size={16} />
        </button>
      </div>
      <div>
        <label className="text-xs text-text-muted mb-1 block">Account Name</label>
        <input className={inp} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Main Checking" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-text-muted mb-1 block">Institution</label>
          <input className={inp} value={f.institution} onChange={(e) => set('institution', e.target.value)} placeholder="Chase" />
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">Type</label>
          <select className={inp} value={f.account_type} onChange={(e) => set('account_type', e.target.value)}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="cash">Cash</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-text-muted mb-1 block">Current Balance ($)</label>
        <input type="number" step="0.01" className={inp} value={f.current_balance} onChange={(e) => set('current_balance', e.target.value)} placeholder="2500.00" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="flex-1 bg-accent-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-accent-primary/90 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : isEditing ? 'Update' : 'Add Account'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-text-muted text-sm border border-border-color rounded-xl hover:text-text-primary transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Account Card ─────────────────────────────────────────────────────────────
function AccountCard({ account, onEdit, onDelete, onUpdateBalance }) {
  const [editingBal, setEditingBal] = useState(false)
  const [balInput, setBalInput]     = useState('')

  const startEdit = () => {
    setBalInput(String(account.current_balance ?? 0))
    setEditingBal(true)
  }

  const commitEdit = async () => {
    const val = parseFloat(balInput)
    if (isNaN(val)) { setEditingBal(false); return }
    await onUpdateBalance(account.id, val)
    setEditingBal(false)
  }

  const typeLabel = account.account_type === 'savings' ? 'Savings' : account.account_type === 'cash' ? 'Cash' : 'Checking'
  const bal = account.current_balance ?? 0

  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
            <Landmark size={18} className="text-accent-primary" />
          </div>
          <div>
            <p className="text-text-primary font-semibold text-sm">{account.name}</p>
            <p className="text-text-muted text-xs">
              {account.institution ? `${account.institution} · ` : ''}{typeLabel}
            </p>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button onClick={() => onEdit(account)} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(account.id)} className="p-1.5 text-text-muted hover:text-accent-danger rounded-lg hover:bg-bg-tertiary transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="border-t border-border-color pt-3">
        {editingBal ? (
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-sm">$</span>
            <input
              type="number"
              step="0.01"
              value={balInput}
              onChange={(e) => setBalInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingBal(false) }}
              onBlur={commitEdit}
              autoFocus
              className="flex-1 bg-bg-tertiary border border-accent-primary rounded-lg px-2 py-1.5 text-text-primary font-mono text-sm focus:outline-none"
            />
          </div>
        ) : (
          <button onClick={startEdit} className="w-full text-left group">
            <p className="text-text-muted text-xs mb-0.5">Balance</p>
            <p className={`text-2xl font-bold font-mono ${bal >= 0 ? 'text-accent-secondary' : 'text-accent-danger'} group-hover:text-accent-primary transition-colors`}>
              {formatCurrency(bal)}
            </p>
            <p className="text-text-muted text-xs mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Tap to update</p>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────
function TransferModal({ accounts, onTransfer, onClose }) {
  const [fromId, setFromId]       = useState('')
  const [toId, setToId]           = useState('')
  const [amount, setAmount]       = useState('')
  const [note, setNote]           = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fromAccount = accounts.find((a) => a.id === fromId)
  const toAccount   = accounts.find((a) => a.id === toId)
  const valid       = fromId && toId && fromId !== toId && parseFloat(amount) > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    try {
      await onTransfer({ from_account_id: fromId, to_account_id: toId, amount: parseFloat(amount), note: note || null })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const inp = 'w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-sm bg-bg-secondary border border-border-color rounded-t-3xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-text-primary font-semibold">Transfer Money</p>
            <p className="text-text-muted text-xs">Move between your accounts</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">From</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={inp} required>
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.current_balance)}</option>
              ))}
            </select>
          </div>

          {fromAccount && toAccount && (
            <div className="flex items-center justify-center gap-2 text-text-muted text-xs">
              <span className="text-text-secondary font-medium">{fromAccount.name}</span>
              <ArrowRight size={14} className="text-accent-primary" />
              <span className="text-text-secondary font-medium">{toAccount.name}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-text-muted mb-1 block">To</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className={inp} required>
              <option value="">Select account…</option>
              {accounts.filter((a) => a.id !== fromId).map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.current_balance)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Amount ($)</label>
            <input type="number" step="0.01" min="0.01" className={inp} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Note (optional)</label>
            <input type="text" className={inp} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Rent contribution" />
          </div>

          {valid && fromAccount && toAccount && (
            <div className="bg-bg-tertiary border border-border-color rounded-xl px-3 py-2.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">{fromAccount.name} after</span>
                <span className="font-mono text-accent-danger font-semibold">{formatCurrency(fromAccount.current_balance - parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">{toAccount.name} after</span>
                <span className="font-mono text-accent-secondary font-semibold">{formatCurrency(toAccount.current_balance + parseFloat(amount))}</span>
              </div>
            </div>
          )}

          <button type="submit" disabled={!valid || submitting} className="w-full bg-accent-primary text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-colors">
            {submitting ? 'Transferring…' : `Transfer ${amount ? formatCurrency(parseFloat(amount) || 0) : '$0.00'}`}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Accounts() {
  const { accounts, loading, fetch, create, update, remove, executeTransfer } = useAccountStore()
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState(null)
  const [saving, setSaving]             = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  useEffect(() => { fetch() }, [fetch])

  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance ?? 0), 0)

  const handleCreate = async (data) => {
    setSaving(true)
    try { await create(data); setShowForm(false); toast.success('Account added') }
    finally { setSaving(false) }
  }

  const handleUpdate = async (data) => {
    setSaving(true)
    try { await update(editing.id, data); setEditing(null); toast.success('Account updated') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    await remove(id)
    toast.success('Account removed')
  }

  const handleUpdateBalance = async (id, balance) => {
    await update(id, { current_balance: balance })
    toast.success('Balance updated')
  }

  const handleTransfer = async (data) => {
    await executeTransfer(data)
    toast.success('Transfer complete')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-text-primary">Accounts</h2>
          <p className="text-text-muted text-xs mt-0.5">Bank accounts & balances</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length >= 2 && (
            <button
              onClick={() => setShowTransfer(true)}
              className="flex items-center gap-1 text-xs text-accent-secondary border border-accent-secondary/30 rounded-xl px-2.5 py-1.5 hover:bg-accent-secondary/10 transition-colors"
            >
              <ArrowLeftRight size={13} /> Transfer
            </button>
          )}
          <button
            onClick={() => { setShowForm(true); setEditing(null) }}
            className="flex items-center gap-1 text-xs text-accent-primary border border-accent-primary/30 rounded-xl px-2.5 py-1.5 hover:bg-accent-primary/10 transition-colors"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-accent-secondary/15 to-accent-primary/5 border border-accent-secondary/25 rounded-2xl p-5">
        <p className="text-text-muted text-xs uppercase tracking-wider font-medium mb-1">Total Balance</p>
        <p className={`text-3xl font-bold font-display ${totalBalance >= 0 ? 'text-accent-secondary' : 'text-accent-danger'}`}>
          {formatCurrency(totalBalance)}
        </p>
        <p className="text-text-muted text-xs mt-1">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
      </div>

      {(showForm || editing) && (
        <AccountForm
          initial={editing ? {
            name:            editing.name,
            institution:     editing.institution || '',
            current_balance: String(editing.current_balance ?? ''),
            account_type:    editing.account_type || 'checking',
          } : undefined}
          onSave={editing ? handleUpdate : handleCreate}
          onCancel={() => { setShowForm(false); setEditing(null) }}
          saving={saving}
          isEditing={!!editing}
        />
      )}

      <div className="space-y-3">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onEdit={(a) => { setEditing(a); setShowForm(false) }}
            onDelete={handleDelete}
            onUpdateBalance={handleUpdateBalance}
          />
        ))}
      </div>

      {accounts.length === 0 && !showForm && !loading && (
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-8 text-center">
          <Landmark size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-primary font-semibold mb-1">No accounts yet</p>
          <p className="text-text-muted text-sm">Add your bank accounts to track balances and cash flow.</p>
        </div>
      )}

      {loading && accounts.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
        </div>
      )}

      {showTransfer && (
        <TransferModal accounts={accounts} onTransfer={handleTransfer} onClose={() => setShowTransfer(false)} />
      )}
    </div>
  )
}
