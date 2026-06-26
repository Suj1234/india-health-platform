'use client'

import { usePathname } from 'next/navigation'
import { JourneySidebar, JourneyMobileBar } from './journey-sidebar'

function getStepFromPath(pathname: string): number {
  const match = pathname.match(/\/apply\/(\d+)/)
  return match ? parseInt(match[1] ?? '1') : 1
}

export function JourneySidebarBridge({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname()
  const step = getStepFromPath(pathname)

  if (mobile) {
    return <JourneyMobileBar currentStep={step} />
  }

  return <JourneySidebar currentStep={step} />
}
