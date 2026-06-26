# Underwriter Portal Specification

**Access**: `/underwriter/*`  
**Users**: Underwriters (per-insurer), Insurer Admins  
**Auth**: Email + password (NextAuth credentials provider)  
**Phase**: 1

---

## 1. Authentication

### Login
**Route**: `/underwriter/login`

```typescript
// NextAuth credentials provider
Credentials: {
  email: string,     // underwriter's email
  password: string   // bcrypt verified against users.password_hash
}

// On success: JWT with:
{
  sub: user.id,
  email: user.email,
  name: user.name,
  role: 'underwriter' | 'insurer_admin',
  insurer_id: string
}

// Session stored in httpOnly cookie, 8-hour expiry
// Auto-redirect to /underwriter/dashboard on success
```

### Access Control
```typescript
// middleware.ts — protect all /underwriter/* routes
if (path.startsWith('/underwriter')) {
  const session = await getServerSession()
  if (!session) redirect('/underwriter/login')
  if (!['underwriter', 'insurer_admin', 'super_admin'].includes(session.user.role)) {
    redirect('/underwriter/login')
  }
}

// Data scoping: underwriter only sees their insurer's applications
// super_admin sees all insurers
// insurer_admin sees their insurer only
```

---

## 2. Dashboard

**Route**: `/underwriter/dashboard`

### Stats Cards (top row)
```typescript
GET /api/underwriter/stats

Displays:
  - Pending Review       (status: uw_pending)
  - Approved Today       (uw_decided_at = today, decision contains 'approved')
  - Rejected Today       (uw_decided_at = today, decision = 'rejected')
  - Docs Requested       (status: uw_more_docs)
  - Total This Month     (created_at within current month)
  - Avg Decision Time    (hours from uw_pending to uw_decided_at)
```

### Application List (below stats)
- Same as `/underwriter/applications` but defaults to `status=uw_pending`
- Shows first 10 pending applications
- "View All" link to full list

---

## 3. Application List

**Route**: `/underwriter/applications`

### Filters (sidebar or top bar)
```
Status:         [ All ] [ Pending ] [ Approved ] [ Rejected ] [ More Docs ] [ Expired ]
Date Range:     From [date picker] To [date picker]
Sum Insured:    Min [number] to Max [number]
Search:         [text input] — searches application_number, name (masked), PAN (masked)
Sort By:        Created Date ↓ | Sum Insured ↓ | Days Pending ↓
```

### Table Columns
```
| # | Application No. | Applicant Name | Age | Sum Insured | Plan | STP Score | Status | Days Pending | Actions |
```

### Table Row Details
```typescript
{
  application_number: "IH-2026-000045",
  customer_name: "RAHUL S.",          // partial name for privacy in list view
  age: 36,
  sum_insured: "₹5,00,000",
  plan_name: "Standard",
  stp_score: 38,                      // color-coded: 0-40 red, 41-70 yellow, 71-100 green
  status: "uw_pending",
  days_pending: 1,
  quick_flags: ["has_ped", "smoker"]  // icon badges
}
```

### Action Buttons per Row
- "Review" → opens application detail page
- Quick decision buttons (visible on hover): "Approve" | "Reject" (opens modal)

### Pagination
- 20 per page (default)
- Pagination controls at bottom

---

## 4. Application Review Detail

**Route**: `/underwriter/applications/{id}`

### Layout
Left column (40%): Application summary + actions  
Right column (60%): Scrollable detail sections

---

### 4.1 Header Section
```
Application: IH-2026-000045    Status: PENDING REVIEW
Submitted: 24 Jun 2026 10:30   Plan: Star Health Standard
STP Decision: REFERRED          STP Score: 38/100
STP Message: "Pre-existing hypertension detected. Manual review required."
```

### 4.2 Applicant Profile
```
PERSONAL DETAILS
Name:           RAHUL SHARMA
DOB:            15 May 1990 (Age: 36)
Gender:         Male
PAN:            ABCDE1234F
Mobile:         98****3210
Email:          r***@example.com
Address:        Mumbai, Maharashtra 400050

FINANCIAL PROFILE
Occupation:     Salaried — Software Engineer
Employer:       Tech Corp Pvt Ltd
Annual Income:  ₹6,00,000
Income Source:  Customer Declared
Bureau Score:   740 (GOOD)
Bank Income:    ₹5,40,000 (consistent)

COMPANY CHECKS (iAdore)
Hazardous Biz:  No ✓
GST Status:     Active ✓
Litigation:     0 cases ✓
```

### 4.3 Selected Plan
```
SELECTED QUOTE
Plan:           Star Health Individual Standard
Sum Insured:    ₹5,00,000
Base Premium:   ₹12,000
GST (18%):      ₹2,160
Total Premium:  ₹14,160
Riders:         OPD Cover (+₹2,360)
Final Total:    ₹16,520
```

### 4.4 Medical Questionnaire
```
PHYSICAL MEASUREMENTS
Height: 172 cm | Weight: 75 kg | BMI: 25.37 (Normal) ✓

LIFESTYLE
Tobacco:  Non-smoker ✓
Alcohol:  Occasional (< 2 units/week) ✓

PRE-EXISTING CONDITIONS
⚠ Hypertension (High Blood Pressure)
  Diagnosed: 2020 | Controlled: Yes
  Treatment: Medication (Amlodipine 5mg)
  Last hospitalized: Never

SURGICAL HISTORY: None ✓

FAMILY HISTORY
⚠ Father: Diabetes (onset age 55, alive)

CURRENT MEDICATIONS
Amlodipine 5mg (daily)

EXISTING INSURANCE: None
PREVIOUS CLAIMS: None

RISK FLAGS: has_ped
RISK SCORE: 25/100
```

### 4.5 ID Verification Results
```
ID VERIFICATION STATUS
PAN Card      ABCDE1234F   ✓ VERIFIED    Match: 95%
Voter ID      —             Not provided
Passport      —             Not provided
```

### 4.6 Documents (Viewer)
```
KYC DOCUMENTS
[Aadhaar Front ✓]  [Aadhaar Back ✓]  [PAN Card ✓]  [Photo ✓]

Click any document → opens inline PDF/image viewer in modal
OCR results shown below each document thumbnail:
  Aadhaar Front: Name ✓ DOB ✓ Address ✓ (confidence: 96%)
  PAN Card: Name ✓ PAN ✓ DOB ✓ (confidence: 98%)

FINANCIAL DOCUMENTS
[Bank Statement ✓]
  Bank: HDFC Bank | Avg Monthly Credit: ₹45,000 | Period: Dec 25 – May 26

[ITR ✓]
  Assessment Year: 2024-25 | Total Income: ₹5,80,000
```

### 4.7 Biometrics (if collected)
```
BIOMETRICS
NuralX Face Scan: COMPLETED (24 Jun 2026 11:15)
  Heart Rate:         72 bpm    ✓ Normal (60-100)
  Respiratory Rate:   16/min    ✓ Normal (12-20)
  Blood Pressure:     118/76    ✓ Normal (<120/<80)
  Oxygen Saturation:  98%       ✓ Normal (>95%)
  Stress Index:       22/100    ✓ Low

PIVC: Not conducted
```

### 4.8 Communication History
```
COMMUNICATION HISTORY
[24 Jun 10:31] Email sent → Application under review notification
[24 Jun 10:30] STP referred → Entered UW queue
```

### 4.9 Previous UW Actions (if any)
Shows all prior actions in timeline format.

---

## 5. Decision Panel (Left Column)

### Decision Buttons
```
[ APPROVE ]              → opens Approve modal
[ APPROVE WITH LOADING ] → opens Loading modal
[ APPROVE WITH EXCLUSION]→ opens Exclusion modal
[ REQUEST MORE DOCS ]    → opens More Docs modal
[ REQUEST MEDICAL TEST ] → opens Medical Test modal
[ REJECT ]               → opens Reject modal
```

All buttons disabled once any final decision (approve/reject) is taken.

---

## 6. Decision Modals

### 6.1 Approve Modal
```
Title: Approve Application IH-2026-000045

Customer Message:
[textarea, pre-filled]:
"We are pleased to inform you that your health insurance application has been approved.
Please click the payment link in your email to complete the purchase."

Internal Notes (not shared with customer):
[textarea, empty]

[ Cancel ]  [ Confirm Approval → Send Email ]
```

**On Confirm**:
1. POST `/api/underwriter/applications/{id}/approve`
2. Update application: `uw_decision = 'approved'`, `status = 'uw_approved'`
3. Generate payment link token (JWT, 7-day expiry)
4. Send email template #4 (UW Approved)
5. Show success toast

---

### 6.2 Loading Modal
```
Title: Approve with Premium Loading

Loading Type:
( ) Percentage Loading    ( ) Flat Amount Loading

[If Percentage selected]:
Loading Percentage: [__]%
  Original Premium:  ₹14,160
  Loading Amount:    ₹X
  Revised Premium:   ₹Y (auto-calculated)

[If Flat selected]:
Loading Amount: ₹[____]
  Original Premium:  ₹14,160
  Revised Premium:   ₹Y (auto-calculated)

Customer Message:
[textarea, pre-filled]:
"Your application has been approved with a loading of {percent}% on the base premium
due to the disclosed health condition(s). The revised annual premium is ₹{revised_premium}."

Internal Notes: [textarea]

[ Cancel ]  [ Confirm & Notify Customer ]
```

**On Confirm**:
1. POST `/api/underwriter/applications/{id}/loading`
2. Update application: `uw_decision = 'approved_with_loading'`, `uw_loading_percent`, `uw_revised_premium`
3. Send email template #5

---

### 6.3 Exclusion Modal
```
Title: Approve with Exclusions

Add Exclusion:
Condition:    [text input or dropdown of common conditions]
Type:         ( ) Permanent  ( ) Temporary (months: [__])
Description:  [textarea]
              [+ Add Another Exclusion]

Exclusions Added:
[List of added exclusions, each removable with ×]

Customer Message: [textarea, pre-filled]

Internal Notes: [textarea]

[ Cancel ]  [ Confirm & Notify Customer ]
```

**Common Exclusion Presets** (dropdown):
- Hypertension and related complications (permanent)
- Diabetes and related complications (permanent)
- All cardiac conditions (permanent)
- Kidney disease and related conditions (permanent)
- Pre-existing conditions — general (permanent)
- Back/spine conditions (2-year temporary)
- Hernia (2-year temporary)

---

### 6.4 More Documents Modal
```
Title: Request Additional Documents

Documents Requested:
[ + Add Document Request ]
  Document Type: [dropdown] — Medical Report | Lab Test | Doctor Certificate | Discharge Summary | Other
  Description:   [textarea — specific instructions]
  Mandatory:     ( ) Yes  ( ) No

[List of added requests]

Customer Message: [textarea, pre-filled]:
"To complete the review of your application, we require the following document(s):
{list_of_docs}
Please upload them within 7 days using the secure link in this email."

Internal Notes: [textarea]

[ Cancel ]  [ Send Request ]
```

**On Confirm**:
1. POST `/api/underwriter/applications/{id}/request-docs`
2. Update application: `status = 'uw_more_docs'`
3. Send email template #8 with upload link
4. Customer uploads → status returns to `uw_pending`

---

### 6.5 Medical Test Modal
```
Title: Request Medical Tests

Tests Required:
[ + Add Test ]
  Test Name:    [dropdown/text] — HbA1c | Fasting Blood Sugar | Lipid Profile | ECG | 2D Echo | Chest X-Ray | Urine Routine | Complete Blood Count | Other
  Lab Preference: [text input, optional]
  Notes:         [textarea]

Customer Message: [textarea]

Internal Notes: [textarea]

[ Cancel ]  [ Send Request ]
```

---

### 6.6 Reject Modal
```
Title: Reject Application IH-2026-000045

Rejection Reason (select one):
( ) High-risk medical condition
( ) Multiple pre-existing conditions
( ) Fraud risk indicated
( ) Age exceeds product limit
( ) Hazardous occupation
( ) Insufficient documentation
( ) Previous claim history — high risk
( ) Customer declined to provide information
( ) Other: [text input]

Customer Message: [textarea, pre-filled]:
"We regret to inform you that after careful review, we are unable to offer health insurance
coverage for your application at this time. [reason if shareable]
You may reapply after {period} or contact us for more information."

Internal Notes: [textarea] — required

[ Cancel ]  [ Confirm Rejection ]
```

**On Confirm**:
1. POST `/api/underwriter/applications/{id}/reject`
2. Update application: `uw_decision = 'rejected'`, `status = 'uw_rejected'`
3. Send email template #7

---

## 7. Email Templates — UW Actions

### Template #4: UW Approved
```
Subject: [Insurer Name] - Your health insurance application is approved!

Body:
Dear {customer_name},

We are pleased to inform you that your health insurance application (Ref: {application_number})
has been approved.

Plan: {plan_name}
Sum Insured: ₹{sum_insured}
Annual Premium: ₹{premium}

To complete your policy purchase, please click the button below:

[PROCEED TO PAYMENT]  ← secure link with JWT token

This link is valid for 7 days.

Regards,
{insurer_name} Team
```

### Template #5: UW Approved with Loading
```
Subject: [Insurer Name] - Your application is approved with revised premium

Dear {customer_name},

Your application (Ref: {application_number}) has been approved.

Due to the medical information provided, the following revision applies:
  Original Premium: ₹{original_premium}
  Loading ({loading_percent}%): ₹{loading_amount}
  Revised Annual Premium: ₹{revised_premium}

[REVIEW AND PROCEED TO PAYMENT]  ← link shows premium breakdown, customer accepts

This link expires in 7 days.
```

### Template #7: UW Rejected
```
Subject: [Insurer Name] - Update on your health insurance application

Dear {customer_name},

We regret to inform you that after careful evaluation, we are unable to offer health
insurance coverage for application {application_number} at this time.

{customer_message}

If you have questions, please contact us at {insurer_contact_email} or {insurer_contact_phone}.

We appreciate your interest in {insurer_name}.
```

---

## 8. UW Portal — Insurer Admin Additional Features

Insurer Admin (role: `insurer_admin`) has access to everything the underwriter has, PLUS:

### User Management (within their insurer)
**Route**: `/underwriter/users`
- List all UW users for their insurer
- Create new UW user (name, email, temp password)
- Deactivate UW user

### Application Reports
**Route**: `/underwriter/reports`
- Export CSV of applications by date range
- STP rate (% approved vs referred)
- Average decision time
- Rejection reason breakdown

---

## 9. UW Portal Security

- All routes protected by middleware (role check)
- All data scoped to `insurer_id` from JWT
- Customer PAN: shown in full (UW needs it for verification)
- Customer mobile: shown masked except last 4 digits
- Customer email: shown masked (first 2 chars + @domain)
- Documents: accessible via signed Cloudinary URLs (generated fresh per request, 1-hour expiry)
- All UW actions logged to `underwriter_actions` table with timestamp and user ID
- No delete capability — all data is immutable audit trail
