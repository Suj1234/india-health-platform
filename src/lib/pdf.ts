import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'

// ── Color constants ───────────────────────────────────────────────────────────
const TEAL = rgb(0.051, 0.361, 0.388)        // #0D5C63
const DARK = rgb(0.102, 0.122, 0.180)        // #1A1F2E
const GRAY = rgb(0.392, 0.451, 0.545)        // #647287
const LIGHT_GRAY = rgb(0.969, 0.980, 0.984)  // #F8FAFB
const WHITE = rgb(1, 1, 1)
const GREEN = rgb(0.063, 0.725, 0.506)       // #10B981
const BORDER = rgb(0.886, 0.910, 0.945)      // #E2E8F0

interface PolicyData {
  // Policy details
  policyNumber: string
  planName: string
  planCode?: string
  sumInsured: number
  basePremium: number
  loadingPercent?: number
  loadingAmount?: number
  finalPremium: number
  gstAmount: number
  totalPremiumPaid: number
  policyStartDate: string
  policyEndDate: string

  // Insured
  insuredName: string
  insuredDob: string
  insuredPan?: string
  nomineeName?: string
  nomineeRelation?: string

  // Members (family floater)
  members?: Array<{ name: string; dob: string; relation: string }>

  // Exclusions
  exclusions: Array<{ name: string; description: string }>

  // Insurer
  insurerName: string
  insurerLogo?: string
  irdaiRegistration: string
  gstin: string
  registeredOffice: string
  grievanceEmail: string
  grievancePhone: string
  contactPhone: string
  contactEmail: string
  freeLookDays: number
}

function drawHLine(page: PDFPage, x: number, y: number, width: number, thickness = 0.5) {
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness,
    color: BORDER,
  })
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = DARK
) {
  page.drawText(text, { x, y, size, font, color })
}

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function wrapText(
  page: PDFPage,
  text: string,
  x: number,
  startY: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  maxChars: number,
  lineHeight: number,
): number {
  const words = text.split(' ')
  let line = ''
  let y = startY
  for (const word of words) {
    if ((line + word).length > maxChars) {
      drawText(page, line.trim(), x, y, font, size, color)
      y -= lineHeight
      line = word + ' '
    } else {
      line += word + ' '
    }
  }
  if (line.trim()) {
    drawText(page, line.trim(), x, y, font, size, color)
    y -= lineHeight
  }
  return y
}

export async function generatePolicyPdf(data: PolicyData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const W = 595
  const H = 842
  const M = 44
  const CW = W - M * 2   // 507

  // ── PAGE 1: POLICY CERTIFICATE ─────────────────────────────────────────────
  const p1 = pdfDoc.addPage([W, H])

  // Header (compact)
  p1.drawRectangle({ x: 0, y: H - 52, width: W, height: 52, color: TEAL })
  drawText(p1, data.insurerName, M, H - 20, boldFont, 14, WHITE)
  drawText(p1, 'Health Insurance Policy Certificate', M, H - 36, regularFont, 8, rgb(0.8, 0.93, 0.94))
  drawText(p1, `IRDAI Reg. No. ${data.irdaiRegistration.split('/').pop()}`, W - M - 115, H - 22, regularFont, 7, rgb(0.8, 0.93, 0.94))
  drawText(p1, `GSTIN: ${data.gstin}`, W - M - 115, H - 34, regularFont, 7, rgb(0.8, 0.93, 0.94))

  // Policy number + status strip
  let y = H - 70
  p1.drawRectangle({ x: M, y: y - 46, width: CW, height: 56, color: LIGHT_GRAY, borderColor: BORDER, borderWidth: 0.5 })
  drawText(p1, 'POLICY NUMBER', M + 12, y - 8, regularFont, 7, GRAY)
  drawText(p1, data.policyNumber, M + 12, y - 28, boldFont, 17, TEAL)
  p1.drawRectangle({ x: W - M - 100, y: y - 26, width: 56, height: 18, color: GREEN })
  drawText(p1, 'ACTIVE', W - M - 94, y - 16, boldFont, 8, WHITE)
  drawText(p1, `${data.policyStartDate}  to  ${data.policyEndDate}`, M + 12, y - 40, regularFont, 7.5, GRAY)

  y -= 66

  // ── Two columns: Insured | Coverage ────────────────────────────────────────
  const c1 = M
  const c2 = M + CW / 2 + 6
  const cW = CW / 2 - 10

  drawText(p1, 'INSURED DETAILS', c1, y, boldFont, 7.5, TEAL)
  drawHLine(p1, c1, y - 5, cW)
  drawText(p1, 'COVERAGE DETAILS', c2, y, boldFont, 7.5, TEAL)
  drawHLine(p1, c2, y - 5, cW)

  // Left column: insured person
  const insuredRows: [string, string][] = [
    ['Full Name', data.insuredName],
    ['Date of Birth', data.insuredDob || 'N/A'],
    ['PAN Number', data.insuredPan || 'N/A'],
  ]
  let ly = y - 18
  for (const [lbl, val] of insuredRows) {
    drawText(p1, lbl, c1, ly, regularFont, 7, GRAY)
    drawText(p1, val, c1, ly - 11, boldFont, 9, DARK)
    ly -= 28
  }
  if (data.nomineeName) {
    ly -= 2
    drawText(p1, 'Nominee', c1, ly, regularFont, 7, GRAY)
    drawText(p1, data.nomineeName, c1, ly - 11, boldFont, 9, DARK)
    drawText(p1, `Relation: ${data.nomineeRelation || 'N/A'}`, c1, ly - 23, regularFont, 8, GRAY)
    ly -= 36
  }
  if (data.members && data.members.length > 0) {
    ly -= 4
    drawText(p1, 'Members Covered', c1, ly, regularFont, 7, GRAY)
    ly -= 12
    for (const m of data.members) {
      drawText(p1, `${m.name}  (${m.relation})`, c1, ly, regularFont, 8, DARK)
      ly -= 12
    }
  }

  // Right column: plan + premium
  const coverageRows: [string, string][] = [
    ['Plan Name', data.planName],
    ['Sum Insured', formatCurrency(data.sumInsured)],
    ['Policy Term', '1 Year'],
  ]
  let ry = y - 18
  for (const [lbl, val] of coverageRows) {
    drawText(p1, lbl, c2, ry, regularFont, 7, GRAY)
    drawText(p1, val, c2, ry - 11, boldFont, 9, DARK)
    ry -= 28
  }
  // Premium rows
  const premLines: [string, string][] = [
    ['Base Annual Premium', formatCurrency(data.basePremium)],
    ...(data.loadingPercent && data.loadingAmount
      ? [[`Loading (${data.loadingPercent}%)`, formatCurrency(data.loadingAmount)] as [string, string]]
      : []),
    ['GST @ 18%', formatCurrency(data.gstAmount)],
  ]
  for (const [lbl, val] of premLines) {
    drawText(p1, lbl, c2, ry, regularFont, 7, GRAY)
    drawText(p1, val, c2 + cW - 70, ry, regularFont, 8, DARK)
    ry -= 16
  }
  // Total premium highlighted
  ry -= 2
  p1.drawRectangle({ x: c2, y: ry - 14, width: cW, height: 22, color: TEAL })
  drawText(p1, 'Total Premium Paid', c2 + 4, ry - 4, regularFont, 7, WHITE)
  drawText(p1, formatCurrency(data.totalPremiumPaid), c2 + cW - 80, ry - 4, boldFont, 9, WHITE)
  ry -= 24

  // Column divider
  const divBottom = Math.min(ly, ry) - 4
  p1.drawLine({ start: { x: M + CW / 2 + 2, y: y - 2 }, end: { x: M + CW / 2 + 2, y: divBottom }, thickness: 0.5, color: BORDER })

  y = divBottom - 12

  // ── Key Benefits ────────────────────────────────────────────────────────────
  drawHLine(p1, M, y + 4, CW)
  drawText(p1, 'KEY BENEFITS COVERED', M, y - 4, boldFont, 7.5, TEAL)

  const benefits = [
    'In-patient hospitalisation expenses',
    'Pre & post-hospitalisation (60 & 90 days)',
    'Day care procedures (140+ treatments)',
    'Ambulance charges up to Rs. 2,000',
    'Domiciliary hospitalisation treatment',
    'AYUSH treatment (Ayurveda, Yoga, Siddha)',
  ]
  const bHalf = Math.ceil(benefits.length / 2)
  let bfy = y - 18
  for (let i = 0; i < bHalf; i++) {
    drawText(p1, `+ ${benefits[i]}`, c1 + 4, bfy, regularFont, 8, DARK)
    if (benefits[i + bHalf]) {
      drawText(p1, `+ ${benefits[i + bHalf]}`, c2 + 4, bfy, regularFont, 8, DARK)
    }
    bfy -= 13
  }

  y = bfy - 10

  // ── Free-look notice ────────────────────────────────────────────────────────
  drawHLine(p1, M, y + 4, CW)
  p1.drawRectangle({ x: M, y: y - 30, width: CW, height: 38, color: rgb(1.0, 0.98, 0.92), borderColor: rgb(0.95, 0.80, 0.2), borderWidth: 0.5 })
  drawText(p1, `FREE-LOOK PERIOD: ${data.freeLookDays} days`, M + 8, y - 9, boldFont, 8, DARK)
  drawText(p1, `Not satisfied? Cancel before ${data.freeLookDays} days for a full refund (less stamp duty & medical examination charges).`, M + 8, y - 22, regularFont, 7, DARK)

  // Footer p1
  drawHLine(p1, M, 34, CW)
  drawText(p1, data.registeredOffice, M, 22, regularFont, 6, GRAY)
  drawText(p1, 'Page 1 of 2', W / 2 - 14, 22, regularFont, 6, GRAY)
  drawText(p1, `${data.contactPhone}  |  ${data.contactEmail}`, W - M - 168, 22, regularFont, 6, GRAY)

  // ── PAGE 2: POLICY INFORMATION ─────────────────────────────────────────────
  const p2 = pdfDoc.addPage([W, H])

  // Thin header
  p2.drawRectangle({ x: 0, y: H - 42, width: W, height: 42, color: TEAL })
  drawText(p2, data.insurerName, M, H - 16, boldFont, 11, WHITE)
  drawText(p2, `Policy No. ${data.policyNumber}`, W - M - 165, H - 16, regularFont, 8, rgb(0.8, 0.93, 0.94))
  drawText(p2, 'Policy Information  —  Please read carefully', M, H - 31, regularFont, 7.5, rgb(0.8, 0.93, 0.94))

  y = H - 58

  // ── Waiting Periods ──────────────────────────────────────────────────────────
  drawText(p2, 'WAITING PERIODS', M, y, boldFont, 8, TEAL)
  drawHLine(p2, M, y - 6, CW)

  const waitingPeriods: [string, string, string, string][] = [
    ['Initial Waiting Period', '30 days from policy start (accidents exempt)',
     'Pre-Existing Diseases', '48 months of continuous coverage required'],
    ['Specified Illnesses', '24 months (cataract, hernia, joint replacement)',
     'Maternity Benefit', '9 months waiting period'],
  ]
  let wy = y - 20
  for (const [l1, v1, l2, v2] of waitingPeriods) {
    drawText(p2, l1, M + 4, wy, boldFont, 8, DARK)
    drawText(p2, v1, M + 4, wy - 11, regularFont, 7.5, GRAY)
    drawText(p2, l2, M + CW / 2 + 4, wy, boldFont, 8, DARK)
    drawText(p2, v2, M + CW / 2 + 4, wy - 11, regularFont, 7.5, GRAY)
    wy -= 28
  }
  y = wy - 10

  // ── Exclusions ──────────────────────────────────────────────────────────────
  drawHLine(p2, M, y + 4, CW)
  drawText(p2, 'WHAT IS NOT COVERED', M, y - 4, boldFont, 8, TEAL)

  const stdExclusions = data.exclusions.length > 0
    ? data.exclusions.map(e => e.name)
    : [
        'Cosmetic or aesthetic treatments',
        'Self-inflicted injuries',
        'Dental treatment (unless hospitalised)',
        'Refractive error correction',
        'Experimental or unproven treatments',
        'War, terrorism, nuclear hazards',
      ]
  const exHalf = Math.ceil(stdExclusions.length / 2)
  let exy = y - 18
  for (let i = 0; i < exHalf; i++) {
    drawText(p2, `- ${stdExclusions[i]}`, M + 4, exy, regularFont, 8, DARK)
    if (stdExclusions[i + exHalf]) {
      drawText(p2, `- ${stdExclusions[i + exHalf]}`, M + CW / 2 + 4, exy, regularFont, 8, DARK)
    }
    exy -= 13
  }
  y = exy - 10

  // ── Claims Process ──────────────────────────────────────────────────────────
  drawHLine(p2, M, y + 4, CW)
  drawText(p2, 'HOW TO FILE A CLAIM', M, y - 4, boldFont, 8, TEAL)

  const claimSteps: [string, string][] = [
    ['Step 1 — Notify Us',
     `Call ${data.contactPhone} (24/7) or email ${data.contactEmail} within 24 hours of planned or emergency admission.`],
    ['Step 2 — Cashless Hospitalisation',
     `Show your policy number at any network hospital. We pre-authorise the claim directly — no upfront payment needed from you.`],
    ['Step 3 — Reimbursement Claims',
     `For non-network hospitals, settle the bills and submit original documents (bills, discharge summary, prescriptions) within 30 days.`],
  ]
  let cly = y - 18
  for (const [step, desc] of claimSteps) {
    drawText(p2, step, M + 4, cly, boldFont, 8, TEAL)
    cly -= 12
    cly = wrapText(p2, desc, M + 4, cly, regularFont, 7.5, GRAY, 92, 12)
    cly -= 6
  }
  y = cly - 6

  // ── Terms summary ────────────────────────────────────────────────────────────
  drawHLine(p2, M, y + 4, CW)
  drawText(p2, 'IMPORTANT TERMS', M, y - 4, boldFont, 8, TEAL)

  const termRows: [string, string][] = [
    ['Renewal', 'This policy is renewable annually. Premium may be revised based on age and claims experience.'],
    ['Portability', 'You may port this policy to another insurer under IRDAI guidelines without losing waiting period credits.'],
    ['Grievance', `Contact ${data.grievanceEmail} | ${data.grievancePhone}. Unresolved complaints may be escalated to the Insurance Ombudsman.`],
  ]
  let ty = y - 18
  for (const [title, body] of termRows) {
    drawText(p2, title, M + 4, ty, boldFont, 8, DARK)
    ty = wrapText(p2, body, M + 4, ty - 11, regularFont, 7.5, GRAY, 92, 12)
    ty -= 6
  }
  y = ty - 6

  // ── Regulatory notice ────────────────────────────────────────────────────────
  drawHLine(p2, M, y + 4, CW)
  p2.drawRectangle({ x: M, y: y - 40, width: CW, height: 48, color: LIGHT_GRAY, borderColor: BORDER, borderWidth: 0.5 })
  drawText(p2, 'REGULATORY NOTICE', M + 8, y - 9, boldFont, 8, DARK)
  drawText(p2,
    `This policy is underwritten by ${data.insurerName}, registered with IRDAI under Reg. No. ${data.irdaiRegistration.split('/').pop()}.`,
    M + 8, y - 21, regularFont, 7.5, GRAY)
  drawText(p2, `GSTIN: ${data.gstin}   |   ${data.registeredOffice}`, M + 8, y - 33, regularFont, 7, GRAY)

  // Footer p2
  drawHLine(p2, M, 34, CW)
  drawText(p2, 'Insurance is the subject matter of solicitation. Please read the policy wordings carefully before acceptance.', M, 22, regularFont, 6, GRAY)
  drawText(p2, 'Page 2 of 2', W / 2 - 14, 22, regularFont, 6, GRAY)

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
