import { useState, useEffect } from 'react'
import { Users, Plus, Pencil, Trash2, Home, X, Link2 } from 'lucide-react'
import { useHouseholdStore }  from '../stores/useHouseholdStore'
import { useIncomeStore }     from '../stores/useIncomeStore'
import { useAuthStore }       from '../stores/useAuthStore'
import { useRoleStore }       from '../stores/useRoleStore'
import { householdDocService } from '../services/firestoreService'
import { formatCurrency }     from '../lib/formatters'
import { toast }              from '../stores/useToastStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name) {
  return (name || '?').split(' ').slice(0, 2).map((w) => (w[0] ?? '').toUpperCase()).join('')
}

const AVATAR_COLORS = [
  'bg-violet-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-amber-600',  'bg-rose-600', 'bg-cyan-600',
]

function avatarColor(name) {
  let n = 0
  for (const c of name || '') n += c.charCodeAt(0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

// Always split equally among user + all contributors
function calcMyShare(totalExpenses, contributors) {
  if (contributors.length === 0) return totalExpenses
  return totalExpenses / (contributors.length + 1)
}

// ─── Contributor Form ─────────────────────────────────────────────────────────
const BLANK = { name: '', salary: '' }

function ContributorForm({ initial, onSave, onCancel, saving, isEditing }) {
  const [f, setF] = useState(initial || BLANK)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const inp = 'w-full bg-bg-secondary border border-border-color rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-colors'

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      name:   f.name,
      salary: parseFloat(f.salary) || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-tertiary border border-accent-primary/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-text-primary font-semibold text-sm">{isEditing ? 'Edit Contributor' : 'Add Contributor'}</p>
        <button type="button" onClick={onCancel} className="p-1 text-text-muted hover:text-text-primary">
          <X size={16}/>
        </button>
      </div>
      <div>
        <label className="text-xs text-text-muted mb-1 block">Name</label>
        <input className={inp} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Camila" required />
      </div>
      <div>
        <label className="text-xs text-text-muted mb-1 block">Monthly income ($)</label>
        <input type="number" step="1" min="0" className={inp} value={f.salary} onChange={(e) => set('salary', e.target.value)} placeholder="3000" />
      </div>
      <p className="text-text-muted text-xs">Expenses split equally among all members.</p>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex-1 bg-accent-primary text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : isEditing ? 'Update' : 'Add'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-text-muted text-sm border border-border-color rounded-xl">Cancel</button>
      </div>
    </form>
  )
}

// ─── You Card ────────────────────────────────────────────────────────────────
function YouCard({ monthlyIncome, myShare }) {
  const remaining = monthlyIncome - myShare
  return (
    <div className="bg-accent-primary/5 border border-accent-primary/25 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-accent-primary flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">YO</span>
        </div>
        <div>
          <p className="text-text-primary font-semibold text-sm">You</p>
          <p className="text-text-muted text-xs">Primary account holder</p>
        </div>
      </div>
      <div className="space-y-1.5 border-t border-border-color pt-3">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Monthly income</span>
          <span className="text-accent-secondary font-mono font-semibold">{formatCurrency(monthlyIncome)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">My share (household)</span>
          <span className="text-accent-danger font-mono font-semibold">{myShare > 0 ? `−${formatCurrency(myShare)}` : formatCurrency(0)}</span>
        </div>
        <div className="flex justify-between text-xs pt-1 border-t border-border-color">
          <span className="text-text-secondary font-medium">Remaining</span>
          <span className={`font-mono font-bold ${remaining >= 0 ? 'text-text-primary' : 'text-accent-danger'}`}>
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Contributor Card ─────────────────────────────────────────────────────────
function ContributorCard({ contributor, share, onEdit, onDelete }) {
  const color     = avatarColor(contributor.name)
  const remaining = (contributor.salary || 0) - share

  return (
    <div className="bg-bg-secondary border border-border-color rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center shrink-0`}>
          <span className="text-white text-sm font-bold">{initials(contributor.name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary font-semibold text-sm">{contributor.name}</p>
          {contributor.salary > 0
            ? <p className="text-text-muted text-xs">{formatCurrency(contributor.salary)}/mo income</p>
            : <p className="text-text-muted text-xs">No income set</p>}
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button onClick={() => onEdit(contributor)} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors">
            <Pencil size={13}/>
          </button>
          <button onClick={() => onDelete(contributor.id)} className="p-1.5 text-text-muted hover:text-accent-danger rounded-lg hover:bg-bg-tertiary transition-colors">
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
      <div className="space-y-1.5 border-t border-border-color pt-3">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Household share</span>
          <span className="text-accent-danger font-mono font-semibold">−{formatCurrency(share)}</span>
        </div>
        {contributor.salary > 0 && (
          <div className="flex justify-between text-xs pt-1 border-t border-border-color">
            <span className="text-text-secondary font-medium">Remaining</span>
            <span className={`font-mono font-bold ${remaining >= 0 ? 'text-text-primary' : 'text-accent-danger'}`}>
              {formatCurrency(remaining)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared Expenses Panel ────────────────────────────────────────────────────
function SharedExpensesPanel({ expenses, myShare }) {
  if (!expenses?.length) return null
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Home size={14} className="text-accent-primary"/>
          <p className="text-text-primary font-semibold text-sm">Shared Expenses</p>
        </div>
        <span className="text-text-muted text-xs">{expenses.length} expenses</span>
      </div>
      <div className="space-y-2">
        {expenses.map((e) => (
          <div key={e.id} className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-text-secondary text-sm truncate">{e.name}</p>
              <p className="text-text-muted text-xs capitalize">{e.category}</p>
            </div>
            <p className="text-text-primary text-sm font-mono font-bold shrink-0">{formatCurrency(e.amount)}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-border-color mt-3 pt-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Total household</span>
          <span className="text-text-primary font-mono font-bold">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">My share</span>
          <span className="text-accent-primary font-mono font-bold">{formatCurrency(myShare)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Member view ──────────────────────────────────────────────────────────────
function MemberHouseholdView({ householdId }) {
  const [sharedExpenses, setSharedExpenses] = useState([])
  const [memberCount,    setMemberCount]    = useState(1)
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    Promise.all([
      householdDocService.getSharedExpenses(householdId),
      householdDocService.get(householdId),
    ]).then(([expenses, hDoc]) => {
      setSharedExpenses(expenses)
      setMemberCount(hDoc?.member_uids?.length ?? 1)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [householdId])

  const myShare = (amt) => amt / Math.max(memberCount, 1)
  const totalShare = sharedExpenses.reduce((s, e) => s + myShare(e.total_amount || 0), 0)

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-display text-text-primary">Household</h2>
        <p className="text-text-muted text-xs mt-0.5">Your shared expenses</p>
      </div>

      <div className="bg-gradient-to-br from-accent-primary/10 to-purple-900/5 border border-accent-primary/20 rounded-2xl p-4">
        <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Your Monthly Share</p>
        <p className="text-3xl font-bold font-display text-accent-primary">{formatCurrency(totalShare)}</p>
        <p className="text-text-muted text-xs mt-1">{sharedExpenses.length} shared expenses · {memberCount} members</p>
      </div>

      {sharedExpenses.length === 0 ? (
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-6 text-center">
          <Home size={28} className="text-text-muted mx-auto mb-2" />
          <p className="text-text-primary font-semibold text-sm mb-1">No shared expenses yet</p>
          <p className="text-text-muted text-xs">The household owner hasn't shared any expenses yet.</p>
        </div>
      ) : (
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Home size={14} className="text-accent-primary" />
            <p className="text-text-primary font-semibold text-sm">Shared Expenses</p>
          </div>
          <div className="space-y-3">
            {sharedExpenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-text-secondary text-sm truncate">{e.name}</p>
                  <p className="text-text-muted text-xs capitalize">{e.category} · due {e.due_type === 'monthly' ? `day ${e.due_day}` : e.due_type}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-accent-primary font-mono font-bold text-sm">{formatCurrency(myShare(e.total_amount || 0))}</p>
                  <p className="text-text-muted text-xs">your share</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Household() {
  const { contributors, householdExpenses, loading, fetch, createContributor, updateContributor, deleteContributor, generateInvite } = useHouseholdStore()
  const { sources, fetchSources } = useIncomeStore()
  const user        = useAuthStore((s) => s.user)
  const { role, householdId } = useRoleStore()
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [inviteLink,   setInviteLink]   = useState(null)
  const [generating,   setGenerating]   = useState(false)

  useEffect(() => { fetch(); fetchSources() }, [fetch, fetchSources])

  if (role === 'member') return <MemberHouseholdView householdId={householdId} />

  const handleGenerateInvite = async () => {
    setGenerating(true)
    try {
      const token = await generateInvite(user.uid, householdExpenses)
      const base  = window.location.href.split('#')[0]
      setInviteLink(`${base}#/join?token=${token}`)
      toast.success('Invite link created!')
    } catch {
      toast.error('Failed to create invite')
    } finally {
      setGenerating(false)
    }
  }

  const monthlyIncome = sources.reduce((s, src) => {
    if (src.is_active === false || src.is_active === 0) return s
    if (src.type === 'biweekly')      return s + (src.amount_per_period ?? 0) * 26 / 12
    if (src.type === 'monthly')       return s + (src.amount_per_period ?? 0)
    return s
  }, 0)

  const totalHousehold = householdExpenses.reduce((s, e) => s + (e.amount || 0), 0)

  // Key fix: calculate user's share based on contributors, not expense.my_share
  const myShare = calcMyShare(totalHousehold, contributors)

  const handleCreate = async (data) => {
    setSaving(true)
    try { await createContributor(data); setShowForm(false); toast.success('Contributor added') }
    finally { setSaving(false) }
  }

  const handleUpdate = async (data) => {
    setSaving(true)
    try { await updateContributor(editing.id, data); setEditing(null); toast.success('Updated') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    await deleteContributor(id)
    toast.success('Removed')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-text-primary">Household</h2>
          <p className="text-text-muted text-xs mt-0.5">Shared expenses & contributors</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleGenerateInvite} disabled={generating}
            className="flex items-center gap-1 text-xs text-accent-secondary border border-accent-secondary/30 rounded-xl px-2.5 py-1.5 hover:bg-accent-secondary/10 transition-colors disabled:opacity-50">
            <Link2 size={13}/> {generating ? 'Creating…' : 'Invite'}
          </button>
          <button onClick={() => { setShowForm(true); setEditing(null) }}
            className="flex items-center gap-1 text-xs text-accent-primary border border-accent-primary/30 rounded-xl px-2.5 py-1.5 hover:bg-accent-primary/10 transition-colors">
            <Plus size={13}/> Add
          </button>
        </div>
      </div>

      {inviteLink && (
        <div className="bg-accent-secondary/10 border border-accent-secondary/30 rounded-2xl p-4">
          <p className="text-text-primary font-semibold text-sm mb-2">Share with your partner</p>
          <p className="text-text-muted text-xs break-all mb-3 font-mono bg-bg-tertiary rounded-lg p-2">{inviteLink}</p>
          <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!') }}
            className="w-full bg-accent-secondary text-white rounded-xl py-2 text-sm font-semibold">
            Copy Link
          </button>
          <p className="text-text-muted text-xs mt-2 text-center">Expires in 7 days · One time use</p>
        </div>
      )}

      {(showForm || editing) && (
        <ContributorForm
          initial={editing ? { name: editing.name, salary: String(editing.salary ?? '') } : undefined}
          onSave={editing ? handleUpdate : handleCreate}
          onCancel={() => { setShowForm(false); setEditing(null) }}
          saving={saving}
          isEditing={!!editing}
        />
      )}

      {/* Contributors */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-text-muted"/>
          <h3 className="text-text-primary font-semibold text-sm">Contributors</h3>
          <span className="text-text-muted text-xs ml-auto">{contributors.length + 1} people</span>
        </div>

        <YouCard monthlyIncome={monthlyIncome} myShare={myShare}/>

        {loading && contributors.length === 0 ? (
          <div className="text-center py-4"><div className="w-5 h-5 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin mx-auto"/></div>
        ) : (
          contributors.map((c) => (
            <ContributorCard
              key={c.id}
              contributor={c}
              share={myShare}
              onEdit={(c) => { setEditing(c); setShowForm(false) }}
              onDelete={handleDelete}
            />
          ))
        )}

        {contributors.length === 0 && !showForm && !loading && (
          <p className="text-text-muted text-xs text-center py-2">Add household members to split shared expenses.</p>
        )}
      </div>

      {/* Shared Expenses */}
      <SharedExpensesPanel expenses={householdExpenses} myShare={myShare}/>

      {householdExpenses.length === 0 && (
        <div className="bg-bg-secondary border border-border-color rounded-2xl p-6 text-center">
          <Home size={28} className="text-text-muted mx-auto mb-2"/>
          <p className="text-text-primary font-semibold text-sm mb-1">No household expenses</p>
          <p className="text-text-muted text-xs">Mark expenses as "Household" in the Expenses page to see them here.</p>
        </div>
      )}
    </div>
  )
}
