import { getInsurerBySlug } from '@/lib/api-router'
import { headers } from 'next/headers'
import { InsurerConfig } from '@/types/insurer'

async function getInsurerForRequest() {
  const headersList = await headers()
  const slug = headersList.get('x-insurer-slug') ?? 'careshield-india'

  try {
    const insurer = await getInsurerBySlug(slug)
    return insurer
  } catch {
    return null
  }
}

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const insurer = await getInsurerForRequest()
  const config = (insurer?.config ?? {}) as Partial<InsurerConfig>

  const primaryColor = config.primary_color ?? '#0D5C63'
  const secondaryColor = config.secondary_color ?? '#ffffff'

  return (
    <>
      <style>{`
        :root {
          --color-primary: ${primaryColor};
          --color-secondary: ${secondaryColor};
        }
      `}</style>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </>
  )
}
