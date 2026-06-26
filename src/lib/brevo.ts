import { allowInsecureTlsIfEnabled } from './server-network'

allowInsecureTlsIfEnabled()

const BREVO_API_KEY = process.env.BREVO_API_KEY!
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL!
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME ?? 'Health Insurance'
const BREVO_API_BASE = 'https://api.brevo.com/v3'

interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  htmlContent: string
  textContent?: string
}

interface SendSmsParams {
  to: string  // E.164 format with country code: +919876543210
  message: string
}

export async function sendEmail(params: SendEmailParams): Promise<string | null> {
  const { to, toName, subject, htmlContent, textContent } = params

  try {
    const res = await fetch(`${BREVO_API_BASE}/smtp/email`, {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
        to: [{ email: to, name: toName ?? to }],
        subject,
        htmlContent,
        textContent: textContent ?? htmlContent.replace(/<[^>]+>/g, ''),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[brevo] sendEmail failed:', err)
      return null
    }

    const data = await res.json() as { messageId?: string }
    return data.messageId ?? null
  } catch (err) {
    console.error('[brevo] sendEmail error:', err)
    return null
  }
}

export async function sendSms(params: SendSmsParams): Promise<boolean> {
  const { to, message } = params
  const phone = to.startsWith('+') ? to : `+91${to}`

  try {
    const res = await fetch(`${BREVO_API_BASE}/transactionalSMS/sms`, {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: 'HLTHINS',  // SMS sender ID (6 chars, TRAI approved)
        recipient: phone,
        content: message,
        type: 'transactional',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[brevo] sendSms failed:', err)
      return false
    }

    return true
  } catch (err) {
    console.error('[brevo] sendSms error:', err)
    return false
  }
}

export async function sendOtpSms(mobile: string, otp: string, insurerName: string): Promise<boolean> {
  const message = `${otp} is your OTP for ${insurerName} health insurance application. Valid for 10 minutes. Do not share with anyone. -HLTHINS`
  return sendSms({ to: mobile, message })
}

export async function sendOtpEmail(email: string, otp: string, insurerName: string): Promise<string | null> {
  return sendEmail({
    to: email,
    subject: `Your OTP for ${insurerName} — ${otp}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0D5C63; margin-bottom: 8px;">${insurerName}</h2>
        <p style="color: #64748b; margin-bottom: 24px;">Your one-time password</p>
        <div style="background: #f8fafb; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1f2e;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This OTP is valid for <strong>10 minutes</strong> and can only be used once.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  })
}

// Email template: Application under review
export async function sendUnderReviewEmail({
  email,
  name,
  applicationNumber,
  planName,
  insurerName,
  contactEmail,
}: {
  email: string
  name: string
  applicationNumber: string
  planName: string
  insurerName: string
  contactEmail: string
}): Promise<string | null> {
  return sendEmail({
    to: email,
    toName: name,
    subject: `${insurerName} — Your health insurance application is under review`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0D5C63;">${insurerName}</h2>
        <p>Dear ${name},</p>
        <p>Your health insurance application has been received and is currently under review by our underwriting team.</p>
        <div style="background: #f8fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">Application Reference</p>
          <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #1a1f2e;">${applicationNumber}</p>
          <p style="margin: 12px 0 0; color: #64748b; font-size: 14px;">Plan: ${planName}</p>
        </div>
        <p>Our team typically reviews applications within <strong>2–3 business days</strong>. You will receive an email once a decision has been made.</p>
        <p>For any queries, contact us at <a href="mailto:${contactEmail}" style="color: #0D5C63;">${contactEmail}</a>.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">— ${insurerName} Team</p>
      </div>
    `,
  })
}

// Email template: UW approved — payment link
export async function sendUwApprovedEmail({
  email,
  name,
  applicationNumber,
  planName,
  premium,
  paymentLink,
  insurerName,
  expiryDays,
}: {
  email: string
  name: string
  applicationNumber: string
  planName: string
  premium: number
  paymentLink: string
  insurerName: string
  expiryDays: number
}): Promise<string | null> {
  return sendEmail({
    to: email,
    toName: name,
    subject: `${insurerName} — Your health insurance application is approved! 🎉`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0D5C63;">${insurerName}</h2>
        <p>Dear ${name},</p>
        <p>We are pleased to inform you that your health insurance application has been <strong>approved</strong>!</p>
        <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #d1fae5;">
          <p style="margin: 0; color: #065f46; font-weight: 600;">✓ Application Approved</p>
          <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Ref: ${applicationNumber}</p>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Plan: ${planName}</p>
          <p style="margin: 4px 0 0; color: #1a1f2e; font-size: 18px; font-weight: 700;">₹${premium.toLocaleString('en-IN')}/year</p>
        </div>
        <p>Complete your policy purchase by clicking the button below:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${paymentLink}" style="background: #0D5C63; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Proceed to Payment →
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">This link is valid for ${expiryDays} days from the date of this email.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— ${insurerName} Team</p>
      </div>
    `,
  })
}

// Email template: Policy issued
export async function sendPolicyEmail({
  email,
  name,
  policyNumber,
  planName,
  sumInsured,
  premium,
  startDate,
  endDate,
  policyDocUrl,
  insurerName,
}: {
  email: string
  name: string
  policyNumber: string
  planName: string
  sumInsured: number
  premium: number
  startDate: string
  endDate: string
  policyDocUrl: string
  insurerName: string
}): Promise<string | null> {
  return sendEmail({
    to: email,
    toName: name,
    subject: `${insurerName} — Your Policy is Active! Policy No. ${policyNumber}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0D5C63;">${insurerName}</h2>
        <p>Dear ${name},</p>
        <p>Congratulations! Your health insurance policy is now <strong>active</strong>.</p>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #bbf7d0;">
          <p style="margin: 0; color: #064e3b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Policy Number</p>
          <p style="margin: 4px 0 12px; font-size: 22px; font-weight: 700; color: #0D5C63;">${policyNumber}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div><p style="margin: 0; color: #64748b; font-size: 12px;">Plan</p><p style="margin: 2px 0 0; color: #1a1f2e; font-weight: 600;">${planName}</p></div>
            <div><p style="margin: 0; color: #64748b; font-size: 12px;">Sum Insured</p><p style="margin: 2px 0 0; color: #1a1f2e; font-weight: 600;">₹${sumInsured.toLocaleString('en-IN')}</p></div>
            <div><p style="margin: 0; color: #64748b; font-size: 12px;">Annual Premium</p><p style="margin: 2px 0 0; color: #1a1f2e; font-weight: 600;">₹${premium.toLocaleString('en-IN')}</p></div>
            <div><p style="margin: 0; color: #64748b; font-size: 12px;">Valid Till</p><p style="margin: 2px 0 0; color: #1a1f2e; font-weight: 600;">${endDate}</p></div>
          </div>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${policyDocUrl}" style="background: #0D5C63; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600;">
            Download Policy Document
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px;">Your policy document is also attached to this email. Keep it safe for future reference.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— ${insurerName} Team</p>
      </div>
    `,
  })
}
