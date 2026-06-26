'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ApplyStep9() {
  const router = useRouter()
  useEffect(() => { router.replace('/apply/8') }, [router])
  return null
}
