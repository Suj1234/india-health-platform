import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { biometricSessions } from '@/lib/db/schema'
import { mapCallbackVitals } from '@/lib/external/nuralx'

// NuralX callback payload shape (matches Callback.java DTO)
interface NuralXMetric<T> {
  value: T
  confidenceLevel?: number | null
}

interface NuralXCallbackBody {
  status: string                     // 'completed' | 'timeout' | 'error'
  event?: string
  client_transaction_ID: string      // = our applicationId
  token?: string
  device_user_id?: string
  timestamp?: string
  results?: {
    pulseRate?: NuralXMetric<number>
    respirationRate?: NuralXMetric<number>
    bloodPressure?: NuralXMetric<{ systolic: number; diastolic: number }>
    stressIndex?: NuralXMetric<number>
    stressLevel?: NuralXMetric<number>
    wellnessIndex?: NuralXMetric<number>
    hemoglobin?: NuralXMetric<number>
    hemoglobinA1c?: NuralXMetric<number>
    [key: string]: unknown
  }
}

export async function POST(req: NextRequest) {
  let body: NuralXCallbackBody
  try {
    body = await req.json() as NuralXCallbackBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const applicationId = body.client_transaction_ID
  if (!applicationId) {
    console.error('[webhooks/nuralx] Missing client_transaction_ID')
    return NextResponse.json({ error: 'Missing client_transaction_ID' }, { status: 400 })
  }

  console.log(`[webhooks/nuralx] Callback | appId: ${applicationId} | status: ${body.status}`)

  try {
    const [session] = await db
      .select()
      .from(biometricSessions)
      .where(eq(biometricSessions.applicationId, applicationId))
      .limit(1)

    if (!session) {
      // Not an error — could be a replay or test ping
      console.warn(`[webhooks/nuralx] No biometric session found for appId: ${applicationId}`)
      return NextResponse.json({ received: true })
    }

    // Already processed — idempotent
    if (session.status === 'completed') {
      return NextResponse.json({ received: true })
    }

    const isTimeout = body.status === 'timeout' || body.status === 'error'

    if (isTimeout) {
      // Guard against stale callbacks from a previous scan overwriting a freshly-reset session.
      // If the session was updated within the last 30 seconds it was just re-initiated — skip.
      const ageMs = Date.now() - new Date(session.updatedAt ?? session.createdAt).getTime()
      if (ageMs < 30_000) {
        console.log(`[webhooks/nuralx] Ignoring stale timeout — session reset ${Math.round(ageMs / 1000)}s ago`)
        return NextResponse.json({ received: true })
      }
      await db
        .update(biometricSessions)
        .set({ status: 'timeout', updatedAt: new Date() })
        .where(eq(biometricSessions.id, session.id))
    } else {
      const vitals = body.results ? mapCallbackVitals(body.results) : null
      await db
        .update(biometricSessions)
        .set({
          status: 'completed',
          result: vitals ?? {},
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(biometricSessions.id, session.id))
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[webhooks/nuralx] DB error:', err)
    // Always 200 to NuralX — retries on non-2xx
    return NextResponse.json({ received: true })
  }
}
