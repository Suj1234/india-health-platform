'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Shield,
  LayoutDashboard,
  FileText,
  Users,
  BarChart2,
  LogOut,
  ChevronRight,
  Bell,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname()
  const active = pathname === item.href || (item.href !== '/underwriter/dashboard' && pathname.startsWith(item.href))

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
        active
          ? 'bg-teal-600 text-white shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      )}
    >
      <span className={cn('shrink-0', active ? 'text-white' : 'text-gray-400')}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full',
          active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  )
}

export default function UWShell({
  children,
  userName,
  userRole,
  pendingCount,
}: {
  children: React.ReactNode
  userName: string
  userRole: string
  pendingCount?: number
}) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems: NavItem[] = [
    { href: '/underwriter/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
    { href: '/underwriter/applications', icon: <FileText className="w-5 h-5" />, label: 'Applications', badge: pendingCount },
    ...(userRole === 'insurer_admin' || userRole === 'super_admin'
      ? [
          { href: '/underwriter/users', icon: <Users className="w-5 h-5" />, label: 'Team Members' },
          { href: '/underwriter/reports', icon: <BarChart2 className="w-5 h-5" />, label: 'Reports' },
        ]
      : []),
  ]

  async function handleLogout() {
    await fetch('/api/auth/staff/logout', { method: 'POST' })
    router.push('/underwriter/login')
  }

  const Sidebar = ({ mobile = false }) => (
    <div className={cn(
      'flex flex-col h-full bg-white border-r border-gray-200',
      mobile ? 'w-full' : 'w-64'
    )}>
      {/* Logo */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">CareShield</p>
            <p className="text-xs text-gray-500">Underwriter Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} onClick={() => setSidebarOpen(false)} />
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-teal-50 border border-teal-200 rounded-full flex items-center justify-center">
            <span className="text-teal-600 text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-500 capitalize">{userRole.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 h-full">
            <Sidebar mobile />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-900 p-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 lg:flex-none" />
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {(pendingCount ?? 0) > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-50 border border-teal-200 rounded-full flex items-center justify-center">
                <span className="text-teal-600 text-xs font-bold">{userName.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-sm text-gray-700 hidden sm:block">{userName}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
