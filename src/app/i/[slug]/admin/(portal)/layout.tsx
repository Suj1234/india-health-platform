import { getInsurerBySlug } from '@/lib/api-router'
import { getStaffSession } from '@/lib/auth'
import { notFound } from 'next/navigation'
import InsurerAdminShell from '@/components/insurer-admin/shell'
import type { InsurerInfo } from '@/components/insurer-admin/shell'
import type { InsurerConfig } from '@/types/insurer'

export default async function InsurerPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const insurer = await getInsurerBySlug(slug)
  if (!insurer || !insurer.isActive) notFound()

  const config = (insurer.config ?? {}) as Partial<InsurerConfig>
  const session = await getStaffSession()

  const insurerInfo: InsurerInfo = {
    id: insurer.id,
    name: insurer.name,
    slug: insurer.slug,
    mode: insurer.mode as 'test' | 'live',
    logoUrl: insurer.logoUrl ?? config.logo_url ?? null,
  }

  return (
    <InsurerAdminShell
      insurer={insurerInfo}
      impersonatedBy={session?.impersonated_by ?? null}
    >
      {children}
    </InsurerAdminShell>
  )
}
