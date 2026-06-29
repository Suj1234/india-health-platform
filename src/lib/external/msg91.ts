const MSG91_BASE_URL = 'https://control.msg91.com/api/v5/flow'

export interface Msg91SendResponse {
  type: 'success' | 'error'
  message?: string
  code?: string
}

export async function sendOtpViaMSG91(mobile: string, otp: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY
  const templateId = process.env.MSG91_TEMPLATE_ID

  if (!authKey || !templateId) {
    throw new Error('MSG91 credentials not configured')
  }

  const res = await fetch(MSG91_BASE_URL, {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id: templateId,
      recipients: [{ mobiles: `91${mobile}`, var: otp }],
    }),
  })

  const data = (await res.json()) as Msg91SendResponse
  return data.type === 'success'
}
