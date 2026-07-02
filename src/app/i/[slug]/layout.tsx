import { getInsurerBySlug } from '@/lib/api-router'
import { notFound } from 'next/navigation'
import { InsurerConfig } from '@/types/insurer'

export default async function InsurerLayout({
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
  const primaryColor = config.primary_color ?? '#0D5C63'
  const secondaryColor = config.secondary_color ?? '#ffffff'
  const fontFamily = config.font_family ?? 'Inter'
  const googleFontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap`

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={googleFontUrl} rel="stylesheet" />
      <style>{`
        :root {
          --color-primary: ${primaryColor};
          --color-secondary: ${secondaryColor};
          --font-family: '${fontFamily}', sans-serif;
        }
      `}</style>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </>
  )
}
