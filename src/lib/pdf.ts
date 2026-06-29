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

export async function generatePolicyPdf(data: PolicyData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const PAGE_WIDTH = 595
  const PAGE_HEIGHT = 842
  const MARGIN = 48

  // ── PAGE 1: Policy Summary ──────────────────────────────────────────────────
  const p1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  // Header bar
  p1.drawRectangle({ x: 0, y: PAGE_HEIGHT - 80, width: PAGE_WIDTH, height: 80, color: TEAL })

  drawText(p1, data.insurerName, MARGIN, PAGE_HEIGHT - 35, boldFont, 18, WHITE)
  drawText(p1, 'Health Insurance Policy', MARGIN, PAGE_HEIGHT - 55, regularFont, 11, rgb(0.8, 0.93, 0.94))
  drawText(p1, `IRDAI: ${data.irdaiRegistration}`, PAGE_WIDTH - MARGIN - 200, PAGE_HEIGHT - 45, regularFont, 8, rgb(0.8, 0.93, 0.94))

  // Policy number badge
  let y = PAGE_HEIGHT - 110
  p1.drawRectangle({ x: MARGIN, y: y - 50, width: PAGE_WIDTH - MARGIN * 2, height: 65, color: LIGHT_GRAY, borderColor: BORDER, borderWidth: 1 })
  drawText(p1, 'POLICY NUMBER', MARGIN + 16, y - 10, regularFont, 8, GRAY)
  drawText(p1, data.policyNumber, MARGIN + 16, y - 32, boldFont, 20, TEAL)
  drawText(p1, `Valid: ${data.policyStartDate} — ${data.policyEndDate}`, PAGE_WIDTH - MARGIN - 180, y - 22, regularFont, 9, GRAY)

  // Policy details grid
  y -= 80
  const col1 = MARGIN
  const col2 = MARGIN + (PAGE_WIDTH - MARGIN * 2) / 2 + 8

  const details: Array<[string, string, number, number]> = [
    ['Plan', data.planName, col1, y],
    ['Sum Insured', formatCurrency(data.sumInsured), col2, y],
    ['Insured Name', data.insuredName, col1, y - 48],
    ['Date of Birth', data.insuredDob, col2, y - 48],
    ['PAN', data.insuredPan ?? 'N/A', col1, y - 96],
    ['Gender', 'As per records', col2, y - 96],
  ]

  for (const [label, value, x, dy] of details) {
    drawText(p1, label, x, dy, regularFont, 8, GRAY)
    drawText(p1, value, x, dy - 16, boldFont, 10, DARK)
  }

  // Nominee
  if (data.nomineeName) {
    y -= 144
    drawHLine(p1, MARGIN, y + 12, PAGE_WIDTH - MARGIN * 2)
    drawText(p1, 'NOMINEE', MARGIN, y - 4, regularFont, 8, GRAY)
    drawText(p1, data.nomineeName, MARGIN, y - 20, boldFont, 10, DARK)
    drawText(p1, `Relationship: ${data.nomineeRelation ?? '—'}`, MARGIN, y - 34, regularFont, 9, GRAY)
  }

  // Premium breakdown
  y -= 190
  drawHLine(p1, MARGIN, y + 12, PAGE_WIDTH - MARGIN * 2)
  drawText(p1, 'PREMIUM DETAILS', MARGIN, y - 4, boldFont, 9, TEAL)

  const premRows: Array<[string, string, boolean]> = [
    ['Base Annual Premium', formatCurrency(data.basePremium), false],
    ...(data.loadingPercent && data.loadingAmount
      ? [[`Loading (${data.loadingPercent}%)`, formatCurrency(data.loadingAmount), false] as [string, string, boolean]]
      : []),
    [`GST (18%)`, formatCurrency(data.gstAmount), false],
    ['Total Premium Paid', formatCurrency(data.totalPremiumPaid), true],
  ]

  let premY = y - 24
  for (const [label, value, isTotal] of premRows) {
    const font = isTotal ? boldFont : regularFont
    const color = isTotal ? DARK : GRAY
    drawText(p1, label, MARGIN + 8, premY, font, isTotal ? 10 : 9, color)
    drawText(p1, value, PAGE_WIDTH - MARGIN - 100, premY, font, isTotal ? 10 : 9, color)
    premY -= isTotal ? 0 : 18
  }

  // Footer
  const footerY = 40
  drawHLine(p1, MARGIN, footerY + 20, PAGE_WIDTH - MARGIN * 2)
  drawText(p1, `GSTIN: ${data.gstin}`, MARGIN, footerY + 8, regularFont, 7, GRAY)
  drawText(p1, `Page 1 of 4`, PAGE_WIDTH / 2 - 20, footerY + 8, regularFont, 7, GRAY)
  drawText(p1, data.registeredOffice, MARGIN, footerY - 4, regularFont, 6, GRAY)

  // ── PAGE 2: Exclusions ──────────────────────────────────────────────────────
  const p2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  p2.drawRectangle({ x: 0, y: PAGE_HEIGHT - 60, width: PAGE_WIDTH, height: 60, color: TEAL })
  drawText(p2, 'Exclusions & Waiting Periods', MARGIN, PAGE_HEIGHT - 35, boldFont, 14, WHITE)
  drawText(p2, data.policyNumber, PAGE_WIDTH - MARGIN - 150, PAGE_HEIGHT - 38, regularFont, 9, rgb(0.8, 0.93, 0.94))

  let excY = PAGE_HEIGHT - 90
  for (const exc of data.exclusions) {
    if (excY < 100) break
    drawText(p2, exc.name, MARGIN, excY, boldFont, 10, DARK)
    excY -= 18
    // Word wrap description manually (simplified)
    const words = exc.description.split(' ')
    let line = ''
    for (const word of words) {
      if ((line + word).length > 90) {
        drawText(p2, line.trim(), MARGIN + 8, excY, regularFont, 8, GRAY)
        excY -= 14
        line = word + ' '
      } else {
        line += word + ' '
      }
    }
    if (line.trim()) {
      drawText(p2, line.trim(), MARGIN + 8, excY, regularFont, 8, GRAY)
      excY -= 14
    }
    excY -= 12
    drawHLine(p2, MARGIN, excY + 6, PAGE_WIDTH - MARGIN * 2, 0.3)
    excY -= 8
  }

  // ── PAGE 3: Terms Summary ───────────────────────────────────────────────────
  const p3 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  p3.drawRectangle({ x: 0, y: PAGE_HEIGHT - 60, width: PAGE_WIDTH, height: 60, color: TEAL })
  drawText(p3, 'Important Terms & Conditions', MARGIN, PAGE_HEIGHT - 35, boldFont, 14, WHITE)

  const terms = [
    ['Free-Look Period', `You may cancel this policy within ${data.freeLookDays} days of receiving the policy document. A proportionate premium for the period on cover shall be deducted, along with stamp duty and medical examination charges.`],
    ['Renewal', 'This policy is renewable annually. The premium may be revised at renewal based on age and claims experience. Renewal is subject to continued insurability.'],
    ['Claims Process', `To file a claim, contact our 24/7 helpline at ${data.contactPhone} or email ${data.contactEmail}. Cashless claims can be availed at network hospitals.`],
    ['Portability', 'As per IRDAI guidelines, you may port this policy to another insurer without losing waiting period credits accumulated under this policy.'],
    ['Grievance Redressal', `For grievances, contact: ${data.grievanceEmail} | ${data.grievancePhone}. If unresolved within 30 days, you may approach the Insurance Ombudsman.`],
  ]

  let termY = PAGE_HEIGHT - 90
  for (const [title, body] of terms) {
    drawText(p3, title, MARGIN, termY, boldFont, 10, TEAL)
    termY -= 18
    const words = body.split(' ')
    let line = ''
    for (const word of words) {
      if ((line + word).length > 90) {
        drawText(p3, line.trim(), MARGIN + 8, termY, regularFont, 8, GRAY)
        termY -= 13
        line = word + ' '
      } else {
        line += word + ' '
      }
    }
    if (line.trim()) {
      drawText(p3, line.trim(), MARGIN + 8, termY, regularFont, 8, GRAY)
      termY -= 13
    }
    termY -= 20
  }

  // ── PAGE 4: IRDAI Notice ────────────────────────────────────────────────────
  const p4 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  p4.drawRectangle({ x: 0, y: PAGE_HEIGHT - 60, width: PAGE_WIDTH, height: 60, color: TEAL })
  drawText(p4, 'IRDAI Mandate & Regulatory Information', MARGIN, PAGE_HEIGHT - 35, boldFont, 14, WHITE)

  const notice = `This insurance product is underwritten by ${data.insurerName}. ${data.insurerName} is registered with the Insurance Regulatory and Development Authority of India (IRDAI) with Registration No. ${data.irdaiRegistration.split('/').pop()}. \n\nGSTIN: ${data.gstin}\n\nRegistered Office: ${data.registeredOffice}\n\nPolicyholders are advised to read the policy wordings carefully before acceptance. Insurance is the subject matter of solicitation.`

  let notY = PAGE_HEIGHT - 90
  for (const line of notice.split('\n')) {
    const words = line.split(' ')
    let l = ''
    for (const w of words) {
      if ((l + w).length > 90) {
        drawText(p4, l.trim(), MARGIN, notY, regularFont, 9, DARK)
        notY -= 15
        l = w + ' '
      } else {
        l += w + ' '
      }
    }
    if (l.trim()) {
      drawText(p4, l.trim(), MARGIN, notY, regularFont, 9, DARK)
      notY -= 15
    }
    notY -= 8
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
