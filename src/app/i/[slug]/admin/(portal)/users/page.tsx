'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Plus, X, RotateCcw, ShieldCheck, Wrench } from 'lucide-react'
import { Breadcrumb } from '@/components/insurer-admin/shell'

interface UserRow {
  id: string
  email: string
  name: string
  role: 'insurer_admin' | 'underwriter'
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
}

interface CreateForm {
  name: string
  email: string
  role: 'insurer_admin' | 'underwriter'
  password: string
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'insurer_admin') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
      <ShieldCheck className="w-3 h-3" />Admin
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      <Wrench className="w-3 h-3" />Underwriter
    </span>
  )
}

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: UserRow) => void }) {
  const [form, setForm] = useState<CreateForm>({ name: '', email: '', role: 'underwriter', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/insurer-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, mustChangePassword: true }),
      })
      const data = await res.json() as { success: boolean; data?: UserRow; error?: string }
      if (!data.success) { setError(data.error ?? 'Failed'); return }
      onCreated(data.data!)
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-900">Add User</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-sm">⚠ {error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as CreateForm['role'] }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="underwriter">Underwriter</option>
              <option value="insurer_admin">Insurer Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Min. 8 characters"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">User will be asked to change this on first login</p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ResetPasswordButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleReset() {
    if (!confirm('Generate a new temporary password for this user?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/insurer-admin/users/${userId}`, { method: 'PATCH' })
      const data = await res.json() as { success: boolean; data?: { temporaryPassword: string } }
      if (data.success && data.data?.temporaryPassword) {
        alert(`New temporary password: ${data.data.temporaryPassword}\n\nShare this securely with the user.`)
        setDone(true)
        setTimeout(() => setDone(false), 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
      {done ? 'Done' : 'Reset password'}
    </button>
  )
}

export default function UsersPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    fetch('/api/insurer-admin/users')
      .then((r) => r.json())
      .then((d: { success: boolean; data: UserRow[] }) => {
        if (d.success) setUsers(d.data)
        else router.push(`/i/${slug}/admin/login`)
      })
      .finally(() => setLoading(false))
  }, [slug, router])

  async function toggleActive(user: UserRow) {
    const res = await fetch(`/api/insurer-admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    const data = await res.json() as { success: boolean }
    if (data.success) {
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !user.isActive } : u))
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>

  const admins = users.filter((u) => u.role === 'insurer_admin')
  const underwriters = users.filter((u) => u.role === 'underwriter')

  function UserTable({ rows }: { rows: UserRow[] }) {
    if (rows.length === 0) return <p className="px-6 py-4 text-sm text-slate-400">No users yet</p>
    return (
      <div className="divide-y divide-slate-50">
        {rows.map((user) => (
          <div key={user.id} className="px-6 py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
              {user.mustChangePassword && (
                <p className="text-xs text-amber-600 mt-0.5">Password change required on next login</p>
              )}
            </div>
            <div className="shrink-0 text-xs text-slate-400">
              {user.lastLoginAt
                ? `Last login ${new Date(user.lastLoginAt).toLocaleDateString('en-IN')}`
                : 'Never logged in'}
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <ResetPasswordButton userId={user.id} />
              <button
                onClick={() => toggleActive(user)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  user.isActive
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-700'
                    : 'bg-red-50 text-red-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <Breadcrumb items={[{ label: 'Dashboard', href: `/i/${slug}/admin` }, { label: 'Users' }]} />
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Users</h1>
          <p className="text-slate-500 text-sm">Manage admin and underwriter access to this portal</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />Add User
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admins</p>
          </div>
          <UserTable rows={admins} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Underwriters</p>
          </div>
          <UserTable rows={underwriters} />
        </div>
      </div>

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onCreated={(u) => setUsers((prev) => [u, ...prev])}
        />
      )}
    </div>
  )
}
