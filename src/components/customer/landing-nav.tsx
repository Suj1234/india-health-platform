'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Shield, Menu, X, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LandingNav() {
  const { slug } = useParams<{ slug: string }>()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-800 shadow-sm group-hover:bg-primary-900 transition-colors">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold text-foreground">CareShield</span>
              <span className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">
                India
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              FAQs
            </Link>
            <a href="tel:18001234567" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="h-3.5 w-3.5" />
              1800-123-4567
            </a>
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href={`/i/${slug}/apply/1`}>
              <Button size="sm">
                Buy Insurance
              </Button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-3">
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMenuOpen(false)}>
              How it works
            </Link>
            <Link href="#features" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMenuOpen(false)}>
              Features
            </Link>
            <Link href="#faq" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMenuOpen(false)}>
              FAQs
            </Link>
            <a href="tel:18001234567" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground py-2">
              <Phone className="h-3.5 w-3.5" />
              1800-123-4567
            </a>
            <Link href={`/i/${slug}/apply/1`} className="w-full mt-1" onClick={() => setMenuOpen(false)}>
              <Button className="w-full" size="md">
                Buy Insurance
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
