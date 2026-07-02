import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getInsurerBySlug } from '@/lib/api-router'
import { ApplyStep1 } from '@/components/customer/apply-step1'
import { ApplyStep2 } from '@/components/customer/apply-step2'
import { ApplyStep3 } from '@/components/customer/apply-step3'
import { ApplyStep4 } from '@/components/customer/apply-step4'
import { ApplyStep5 } from '@/components/customer/apply-step5'
import { ApplyStep6 } from '@/components/customer/apply-step6'
import { ApplyStep7 } from '@/components/customer/apply-step7'

const STEP_TITLES: Record<string, string> = {
  '1': 'Verify Mobile',
  '2': 'Identity & Members',
  '3': 'Health Declaration',
  '4': 'Plan Confirmation',
  '5': 'Documents',
  '6': 'Proposal & Nominee',
  '7': 'Application Result',
}

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  '1': ApplyStep1,
  '2': ApplyStep2,
  '3': ApplyStep3,
  '4': ApplyStep4,
  '5': ApplyStep6,
  '6': ApplyStep5,
  '7': ApplyStep7,
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; step: string }>
}): Promise<Metadata> {
  const { slug, step } = await params
  const insurer = await getInsurerBySlug(slug)
  const insurerName = insurer?.name ?? 'Insurance'
  const title = STEP_TITLES[step] ?? 'Apply'
  return {
    title: `Step ${step}: ${title} — ${insurerName}`,
  }
}

export default async function ApplyStepPage({
  params,
}: {
  params: Promise<{ slug: string; step: string }>
}) {
  const { step } = await params
  const StepComponent = STEP_COMPONENTS[step]
  if (!StepComponent) notFound()
  return <StepComponent />
}
