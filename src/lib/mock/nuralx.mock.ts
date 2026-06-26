import type { NuralXVitals } from '@/types/application'
import { randomInt } from 'crypto'

export function mockNuralXScanInitiate(applicationId: string): {
  scan_id: string
  scan_url: string
  expires_at: string
} {
  const scanId = `NX-${applicationId.slice(0, 8)}-${Date.now()}`
  return {
    scan_id: scanId,
    scan_url: `https://scan.nuralx.ai/s/${scanId}`,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

export function mockNuralXVitals(): NuralXVitals {
  return {
    heart_rate: randomInt(65, 85),
    respiratory_rate: randomInt(14, 18),
    blood_pressure_systolic: randomInt(110, 125),
    blood_pressure_diastolic: randomInt(70, 82),
    oxygen_saturation: randomInt(96, 99),
    stress_index: randomInt(15, 35),
    risk_score: randomInt(10, 30),
  }
}
