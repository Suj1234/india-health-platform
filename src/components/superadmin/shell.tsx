'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Building2, ClipboardList, LogOut, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ShellProps {
  children: React.ReactNode
  user?: { name?: string; email?: string }
}

const NAV_ITEMS = [
  { href: '/superadmin', label: 'Insurers', icon: Building2, exact: true },
  { href: '/superadmin/audit', label: 'Audit Log', icon: ClipboardList, exact: false },
]

export default function SuperadminShell({ children, user }: ShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/staff/logout', { method: 'POST' })
    router.push('/superadmin/login')
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">Insuretech</p>
              <p className="text-slate-500 text-xs mt-0.5">Platform Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + Sign out */}
        <div className="px-3 py-4 border-t border-slate-800">
          {user && (
            <div className="px-3 py-2 mb-1">
              <p className="text-white text-xs font-medium truncate">{user.name ?? 'Superadmin'}</p>
              <p className="text-slate-500 text-xs truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
  )
}

// ── Breadcrumb ──────────────────────────────────────────────────────────────

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
