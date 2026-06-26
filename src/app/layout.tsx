import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Health Insurance — Simple, Fast, Digital',
    template: '%s | Health Insurance',
  },
  description:
    'Get comprehensive health insurance coverage in under 15 minutes. 100% digital, IRDAI-approved, instant policy issuance.',
  keywords: ['health insurance', 'India', 'digital', 'instant policy', 'IRDAI'],
  robots: { index: false, follow: false }, // Phase 1: not indexed
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
