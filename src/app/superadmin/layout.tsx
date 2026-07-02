import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s — Superadmin | Insuretech',
    default: 'Superadmin | Insuretech',
  },
  robots: { index: false, follow: false },
}

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return children
}
