import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s — Underwriter Portal | CareShield',
    default: 'Underwriter Portal | CareShield',
  },
  robots: { index: false, follow: false },
}

export default function UnderwriterLayout({ children }: { children: React.ReactNode }) {
  return children
}
