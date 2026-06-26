# BRD — Business Requirements Document
**Product**: India Health Insurance Platform  
**Version**: 1.0  
**Date**: June 2026  

---

## 1. Business Objectives

### Primary Objective
Build a white-label digital insurance onboarding platform that enables health insurers in India to offer a fully online, near-instant policy issuance experience with minimal manual intervention.

### Secondary Objectives
1. Reduce cost per policy issued by eliminating paper-based and manual processes
2. Increase STP (Straight-Through Processing) rate through automated underwriting
3. Enable fraud detection before policy issuance through multi-source data enrichment
4. Maximize premium accuracy through proper income and risk profiling
5. Provide insurers a configurable, brandable platform without building from scratch

---

## 2. Business Context

### Problem Statement
Traditional health insurance onboarding in India involves:
- Paper forms or long digital forms requiring manual entry
- Physical document submission
- 3-7 day underwriting turnaround
- Multiple customer touchpoints (agents, branch visits)
- High drop-off due to friction

### Opportunity
- India's health insurance market: ~₹90,000 crore and growing 18% YoY
- Digital-first buyers: 60%+ of new buyers prefer online purchase
- IRDAI push for digital-first insurance via BIMA SUGAM
- APIs now available (Perfios, Karza, ABDM) to automate KYC and underwriting data collection

### Positioning
This platform is a **technology layer** between insurers and their end-customers. The insurer provides:
- Their insurance product (plans, pricing, STP rules)
- Their API credentials for data enrichment partners
- Their underwriting team access

The platform provides:
- The digital journey (customer portal)
- Data enrichment orchestration
- STP decision support
- Underwriter workflow
- Policy document generation

---

## 3. Stakeholder Analysis

| Stakeholder | Role | Needs | Priority |
|---|---|---|---|
| Platform Owner | Builds & operates platform | Scalable, maintainable, white-label ready | High |
| Insurer (Client) | Pays to use platform | Branded, configurable, compliant, fast STP | High |
| End Customer | Buys insurance | Fast, simple, trustworthy journey, minimum data entry | High |
| Underwriter | Reviews non-STP cases | Clear decision UI, all data in one place, fast workflow | High |
| IRDAI | Regulator | Compliance with digital insurance regulations | Medium |
| Data Partners | API providers | Correct API usage, SLA compliance | Medium |

---

## 4. Business Rules

### BR-001: White-Label Isolation
Each insurer is completely isolated. Customers of Insurer A cannot see or interact with data from Insurer B. All data is tagged with `insurer_id` at every level.

### BR-002: Mode-Based API Usage
Each insurer independently operates in test or live mode. Test mode always uses mock API responses. Live mode uses real APIs with fallback to mock if credentials are absent.

### BR-003: PAN Uniqueness Per Insurer
A customer can only have one active (non-terminal) application per insurer at a time. Terminal statuses: `policy_issued`, `application_closed`, `rejected`.

### BR-004: Application Expiry
- STP approved: customer has 24 hours to complete payment
- UW approved: customer has 7 days to complete payment
- Applications not progressed for 30 days: auto-archived

### BR-005: OTP Limits
- Maximum 2 OTPs per application lifetime
- OTP 1: mobile verification at start
- OTP 2: payment authorization (STP) or post-UW payment authorization (non-STP)
- OTP valid for 10 minutes
- Max 3 wrong attempts → 30-minute lockout

### BR-006: Document Requirements
Minimum KYC (all applications):
- Aadhaar (front + back)
- PAN card
- Photograph

Additional documents (sum insured > ₹10 lakhs):
- Bank statement (last 6 months)
- ITR or Form 16

Additional documents (sum insured > ₹20 lakhs, additional to above):
- ITR for last 2 years
- Latest payslip (salaried)

### BR-007: Biometric Trigger Conditions
Biometrics (PIVC or NuralX) are triggered when ANY of:
- Sum insured > ₹20 lakhs
- Applicant age > 50
- Any pre-existing condition declared
- STP engine explicitly requests it in response
- Litigation flag raised by iAdore

### BR-008: STP Routing
- STP APPROVED → direct payment → policy issued
- STP REFERRED → underwriter queue → UW decision → customer notified

### BR-009: Policy Issuance Only After Payment
A policy number is generated ONLY after Razorpay payment signature is verified server-side. No exceptions.

### BR-010: Underwriter Cannot Modify Application Data
Underwriters can only:
- View all submitted data
- Make a decision (approve/reject/loading/exclusion/more-docs)
- Add internal notes
They cannot edit the customer's submitted answers.

### BR-011: Razorpay Mode
Payment mode (test/live) is controlled by a global `RAZORPAY_MODE` env variable, not by insurer mode. This is because payment credentials are platform-level, not insurer-level.

### BR-012: Mandatory Medical Questionnaire
Medical questionnaire is mandatory for ALL applications regardless of age, sum insured, or product. No bypass.

### BR-013: Consent Before Data Collection
Customer must explicitly check consent checkbox before:
- Sharing PAN/mobile for iAdore profiling
- Uploading documents for OCR
- Sharing health data in medical questionnaire

### BR-014: Policy Document Contents (IRDAI Mandated)
Every policy PDF must include:
- Policy number
- Insurer name and IRDAI registration number
- Insured name and DOB
- Sum insured
- Annual premium
- GST amount
- Total premium paid
- Policy start and end date
- Exclusions list (standard + any UW-added exclusions)
- Loading (if any)
- Network hospital lookup link
- Grievance redressal details
- Free-look period (15 days as per IRDAI)

### BR-015: Free-Look Period
Customer can cancel within 15 days of policy issuance. Refund process is out of Phase 1 scope but the policy document must mention this right.

---

## 5. Compliance Requirements (India / IRDAI)

### 5.1 IRDAI Guidelines for Digital Insurance
- Customer identity must be verified (KYC) before policy issuance
- Customer must give informed consent for data sharing
- Policy document must be sent within 15 days of premium receipt (we target same-day)
- Grievance redressal mechanism must be stated in policy document
- Free-look period of 15 days must be mentioned

### 5.2 KYC / AML Requirements (PMLA)
- PAN mandatory for policies with premium > ₹50,000/year
- Aadhaar-based KYC acceptable for digital journeys
- CKYC (Central KYC) preferred (via Karza TKYC)

### 5.3 Data Privacy (DPDP Act 2023)
- Customer data collected only for insurance purposes
- Customer must consent before data processing
- Right to access and delete personal data
- Data breach notification within 72 hours
- Note: DPDP rules are still being finalized — platform must be ready to comply

### 5.4 GST on Insurance Premium
- Health insurance premium attracts 18% GST
- GST must be separately shown in quote, checkout, and policy document
- Insurer's GSTIN must be on policy document

### 5.5 IRDAI Sandbox / Product Filing
- Each insurer must have their health product filed with IRDAI
- Platform does not file products — that is insurer's responsibility
- Platform must support insurer-specific product configurations

---

## 6. Revenue Model (Platform Perspective)

> Note: This is informational for platform operation decisions, not built into the application.

- Per-policy issuance fee charged to insurer (₹X per policy)
- Monthly SaaS fee per insurer (optional model)
- Volume-based pricing tiers

---

## 7. Key Data Flows

### Flow 1: STP Journey (Happy Path)
```
Customer → Mobile OTP → PAN + Details
→ iAdore profiling (auto-fill)
→ Income consolidation
→ PMW needs analysis
→ Quote selection
→ Medical questionnaire
→ Proposal + ID verification
→ Document upload + OCR
→ [Conditional] Biometrics
→ STP engine → APPROVED
→ Razorpay payment
→ Policy issued → PDF emailed
```

### Flow 2: Non-STP Journey
```
... [same as above up to STP evaluation] ...
→ STP engine → REFERRED
→ Application enters UW queue
→ Customer: "Under review" email
→ Underwriter reviews → Decision
→ [If approved] Customer email with secure link
→ Customer: OTP2 → view decision → accept → Razorpay payment
→ Policy issued → PDF emailed

→ [If rejected] Customer: rejection email with reason
→ [If more docs] Customer: email with doc request → upload → back to UW queue
```

### Flow 3: UW More Documents Loop
```
UW requests docs
→ Customer email: doc request
→ Customer uploads requested docs
→ Application status → uw_pending (again)
→ UW reviews again → makes final decision
```

---

## 8. Integration Dependencies

| Dependency | Purpose | Risk if unavailable | Mitigation |
|---|---|---|---|
| iAdore (Perfios) | Demographic profiling | Customer must manually enter all fields | Manual form fallback |
| ProtectMeWell | Needs analysis | Skip needs step, go direct to quotes | Skip step in config |
| Quote API | Premium generation | Cannot show quotes | Mock quotes with disclaimer |
| Karza TKYC | ID verification | ID not verified | Manual UW review; allow skip with flag |
| Karza OCR | Document digitization | Documents uploaded but not parsed | Documents stored, UW reviews manually |
| NuralX | Face biometric vitals | Biometric data not available | Application still proceeds; UW notes absence |
| PIVC | Video verification | PIVC not completed | Application still proceeds with flag |
| STP Engine | Underwriting decision | Cannot auto-decide | All applications → UW queue |
| Razorpay | Payment | No payment possible | Platform cannot issue policy |
| Brevo | Email / OTP | OTPs not delivered | Critical failure; must have redundancy |
| Cloudinary | Document storage | Documents not stored | Critical failure; block upload step |
| Neon DB | Primary data store | Platform down | Critical failure |

---

## 9. Success Criteria for Phase 1 Launch

- [ ] Customer can complete full STP journey end-to-end
- [ ] Customer can complete non-STP journey end-to-end (including UW review)
- [ ] At least 1 insurer configured and live in test mode
- [ ] Underwriter portal functional with all decision types
- [ ] Policy PDF generated and emailed on payment success
- [ ] All external API mock responses working (test mode)
- [ ] OTP delivery working via Brevo
- [ ] Razorpay test payment working
- [ ] Admin can create insurer and toggle mode
- [ ] Application data persisted in Neon DB
- [ ] Documents stored in Cloudinary

---

## 10. Out of Scope (Phase 1)

- Agent portal
- Policy renewal
- Claims processing
- Group / corporate health insurance
- Regional language support
- ABDM integration
- Mobile app
- Third-party comparison / aggregator integration
- Chatbot
- WhatsApp journey
- Premium refund / cancellation flows
- Offline / paper fallback
