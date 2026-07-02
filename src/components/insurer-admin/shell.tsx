'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Palette, Building2, Package, ToggleLeft,
  Key, Users, ClipboardList, LogOut, ChevronRight, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export interface InsurerInfo {
  id: string
  name: string
  slug: string
  mode: 'test' | 'live'
  logoUrl: string | null
}

interface ShellProps {
  children: React.ReactNode
  insurer: InsurerInfo
  impersonatedBy?: string | null
}

function navItems(slug: string) {
  return [
    { href: `/i/${slug}/admin`, label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: `/i/${slug}/admin/branding`, label: 'Branding', icon: Palette, exact: false },
    { href: `/i/${slug}/admin/company`, label: 'Company', icon: Building2, exact: false },
    { href: `/i/${slug}/admin/product`, label: 'Product Config', icon: Package, exact: false },
    { href: `/i/${slug}/admin/flags`, label: 'Feature Flags', icon: ToggleLeft, exact: false },
    { href: `/i/${slug}/admin/api-credentials`, label: 'API Credentials', icon: Key, exact: false },
    { href: `/i/${slug}/admin/users`, label: 'Users', icon: Users, exact: false },
    { href: `/i/${slug}/admin/audit`, label: 'Audit Log', icon: ClipboardList, exact: false },
  ]
}

export default function InsurerAdminShell({ children, insurer, impersonatedBy }: ShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/staff/logout', { method: 'POST' })
    router.push(`/i/${insurer.slug}/admin/login`)
  }

  async function handleExitImpersonation() {
    const res = await fetch('/api/insurer-admin/impersonate/exit', { method: 'POST' })
    const data = await res.json() as { redirectTo?: string }
    router.push(data.redirectTo ?? '/superadmin')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Impersonation banner */}
      {impersonatedBy && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            You are impersonating <strong>{insurer.name}</strong> as a superadmin.
            All changes are logged.
          </div>
          <button
            onClick={handleExitImpersonation}
            className="bg-amber-900/20 hover:bg-amber-900/30 px-3 py-1 rounded text-xs font-semibold transition-colors"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-slate-200">
          {/* Insurer logo + name */}
          <div className="px-4 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              {insurer.logoUrl ? (
                <div className="w-8 h-8 rounded flex items-center justify-center bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                  <Image src={insurer.logoUrl} alt={insurer.name} width={32} height={32} className="object-contain" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-slate-900 font-semibold text-sm leading-none truncate">{insurer.name}</p>
                <p className="text-slate-400 text-xs mt-0.5">Admin Portal</p>
              </div>
            </div>

            {/* Mode badge */}
            <div className="mt-3">
              <Link
                href={`/i/${insurer.slug}/admin`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
                  insurer.mode === 'live'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${insurer.mode === 'live' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                {insurer.mode === 'live' ? 'Live Mode' : 'Test Mode'}
              </Link>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {navItems(insurer.slug).map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Sign out */}
          <div className="px-3 py-3 border-t border-slate-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-slate-500 mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-800 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-800 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
