import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky minimal header */}
      <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-border bg-white/95 backdrop-blur-xl">
        <div className="h-full flex items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-800 group-hover:bg-primary-900 transition-colors">
              <Shield className="h-[15px] w-[15px] text-white" />
            </div>
            <span className="text-sm font-bold text-foreground">CareShield</span>
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Shield className="h-3 w-3 text-emerald-500" />
            <span className="hidden sm:inline">256-bit SSL · IRDAI Approved</span>
            <span className="sm:hidden">Secured</span>
          </div>
        </div>
      </header>

      {/* Page content — each step handles its own layout */}
      <div className="flex flex-col flex-1">
        {children}
      </div>
    </div>
  )
}
