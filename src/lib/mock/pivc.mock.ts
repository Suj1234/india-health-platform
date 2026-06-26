export function mockPivcSession(applicationId: string): {
  session_id: string
  pivc_link: string
  expires_at: string
} {
  return {
    session_id: `PIVC-${applicationId.slice(0, 8)}-${Date.now()}`,
    pivc_link: `https://verify.pivc.in/v/${applicationId.slice(0, 8)}`,
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  }
}

export function mockPivcResult(): { outcome: 'passed' | 'failed'; agent_notes: string } {
  return {
    outcome: 'passed',
    agent_notes: 'Customer identity verified. Documents match. No discrepancies found.',
  }
}
