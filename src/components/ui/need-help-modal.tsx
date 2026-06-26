'use client'

import { Phone, Mail } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

interface NeedHelpModalProps {
  open: boolean
  onClose: () => void
}

export function NeedHelpModal({ open, onClose }: NeedHelpModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Need help?" closable maxWidth="sm">
      <div className="space-y-3">
        <a
          href="tel:18002003000"
          className="flex items-center gap-4 rounded-xl border border-border p-4 hover:bg-slate-50 transition-colors group"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 group-hover:bg-primary-100 transition-colors">
            <Phone className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Call us (toll-free)</p>
            <p className="text-sm font-bold text-foreground">1800-200-3000</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Mon–Sat · 9 AM – 6 PM IST</p>
          </div>
        </a>

        <a
          href="mailto:support@careshield.in"
          className="flex items-center gap-4 rounded-xl border border-border p-4 hover:bg-slate-50 transition-colors group"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
            <Mail className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Email us</p>
            <p className="text-sm font-bold text-foreground">support@careshield.in</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Response within 4 business hours</p>
          </div>
        </a>
      </div>
    </Modal>
  )
}
