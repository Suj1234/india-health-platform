'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { KeyRound, Eye, EyeOff, Check } from 'lucide-react'

export default function ChangePasswordPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const mismatch = confirm.length > 0 && password !== confirm
  const isValid = password.length >= 8 && password === confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/insurer-admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      })
      const data = await res.json() as { success: boolean; error?: string }

      if (!data.success) {
        setError(data.error ?? 'Failed to change password')
        return
      }

      router.push(`/i/${slug}/admin`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl border border-amber-200 mb-4">
            <KeyRound className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
          <p className="text-gray-500 mt-1 text-sm">You must set a new password before continuing</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="At least 8 characters"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="mt-1.5 text-xs text-red-600">Password must be at least 8 characters</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${mismatch ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                placeholder="Repeat password"
              />
              {mismatch && <p className="mt-1.5 text-xs text-red-600">Passwords do not match</p>}
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 disabled:text-indigo-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Setting password…</>
              ) : (
                <><Check className="w-4 h-4" />Set Password & Continue</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
