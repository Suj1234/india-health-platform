# Internal API Specification
**All Next.js API Routes — Request/Response contracts**

## Conventions
- All routes under `/api/`
- Auth: `Authorization: Bearer {token}` OR httpOnly cookie `auth_token`
- Success response: `{ success: true, data: T }`
- Error response: `{ success: false, error: string, code?: string }`
- Monetary amounts: INR decimal (e.g., 15000.00)
- Dates: ISO 8601 string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)

---

## Auth APIs

### POST /api/auth/send-otp
Send OTP to mobile number.

**Auth**: Public  
**Rate limit**: 3 per mobile per hour

Request:
```json
{
  "mobile": "9876543210",
  "insurer_slug": "star-health",
  "purpose": "mobile_verification"
}
```
Response:
```json
{
  "success": true,
  "data": {
    "otp_ref_id": "uuid",
    "expires_in_seconds": 600,
    "delivery_method": "sms"
  }
}
```

---

### POST /api/auth/verify-otp
Verify OTP, create/link user, create application.

**Auth**: Public

Request:
```json
{
  "mobile": "9876543210",
  "otp": "123456",
  "otp_ref_id": "uuid",
  "insurer_slug": "star-health",
  "purpose": "mobile_verification",
  "initial_sum_insured": 500000,
  "initial_members": 1,
  "initial_plan_type": "individual"
}
```
Response:
```json
{
  "success": true,
  "data": {
    "application_id": "uuid",
    "application_number": "IH-2026-000001",
    "next_step": 2
  }
}
```
Sets httpOnly cookie: `auth_token` (JWT, 24h expiry)

---

### POST /api/auth/logout
Clear customer session.

**Auth**: Customer JWT

Request: `{}`  
Response: `{ "success": true }`  
Clears `auth_token` cookie.

---

### GET /api/auth/session
Get current session info.

**Auth**: Customer JWT

Response:
```json
{
  "success": true,
  "data": {
    "application_id": "uuid",
    "application_number": "IH-2026-000001",
    "current_step": 3,
    "status": "profiling_done",
    "insurer_slug": "star-health"
  }
}
```

---

## Journey APIs

### POST /api/journey/start
Create new application (alternative entry without landing page).

**Auth**: Customer JWT (from OTP verify)

Request:
```json
{
  "insurer_slug": "star-health",
  "initial_sum_insured": 500000,
  "initial_plan_type": "individual",
  "initial_members": 1
}
```
Response:
```json
{
  "success": true,
  "data": {
    "application_id": "uuid",
    "application_number": "IH-2026-000001"
  }
}
```

---

### POST /api/journey/profile
Submit basic details and trigger iAdore profiling.

**Auth**: Customer JWT  
**Guard**: status must be `otp_verified`

Request:
```json
{
  "application_id": "uuid",
  "pan": "ABCDE1234F",
  "name": "Rahul Sharma",
  "dob": "1990-05-15",
  "gender": "male",
  "email": "rahul@example.com",
  "vehicle_reg_number": "MH01AB1234"
}
```
Response:
```json
{
  "success": true,
  "data": {
    "iadore_job_id": "uuid",
    "next_step": 3
  }
}
```

---

### GET /api/journey/profile/status
Poll iAdore profiling status.

**Auth**: Customer JWT  
**Query params**: `application_id`

Response (running):
```json
{ "success": true, "data": { "status": "running", "progress_percent": 40 } }
```

Response (done):
```json
{
  "success": true,
  "data": {
    "status": "done",
    "summary": {
      "name": "RAHUL SHARMA",
      "dob": "1990-05-15",
      "gender": "male",
      "address": {
        "line1": "123 MG Road",
        "line2": "Bandra West",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400050"
      },
      "employer_name": "Tech Corp Pvt Ltd",
      "occupation_type": "salaried",
      "pan_category": "P",
      "company_is_hazardous": false,
      "gst_registered": true,
      "litigation_count": 0,
      "bureau_score": 750,
      "income_from_bureau": 480000,
      "income_from_bank_statement": 500000,
      "surrogate_income": null
    },
    "next_step": 4
  }
}
```

Response (failed):
```json
{
  "success": true,
  "data": {
    "status": "failed",
    "allow_manual_entry": true,
    "message": "Could not fetch profile. Please enter details manually."
  }
}
```

---

### POST /api/journey/income
Submit income profile.

**Auth**: Customer JWT  
**Guard**: status must be `profiling_done`

Request:
```json
{
  "application_id": "uuid",
  "customer_declared_income": 600000,
  "vehicle_reg_number": "MH01AB1234"
}
```
Response:
```json
{
  "success": true,
  "data": {
    "income_profile": {
      "selected_source": "customer_declared",
      "selected_annual_income": 600000,
      "sources": {
        "customer_declared": 600000,
        "bank_statement": 520000,
        "bureau": 480000,
        "vehicle_surrogate": 200000
      },
      "cross_analysis": [
        { "source": "bank_statement", "amount": 520000, "consistency": "within_20_percent", "flag": null },
        { "source": "bureau", "amount": 480000, "consistency": "within_20_percent", "flag": null }
      ]
    },
    "next_step": 5
  }
}
```

---

### GET /api/journey/needs
Get PMW needs analysis.

**Auth**: Customer JWT  
**Query params**: `application_id`  
**Guard**: status must be `income_done`

Response:
```json
{
  "success": true,
  "data": {
    "needs_summary": {
      "health_insurance": {
        "recommended_cover": 500000,
        "premium_estimate": 12000,
        "tiers": [
          { "cover": 300000, "premium": 8500, "label": "Basic" },
          { "cover": 500000, "premium": 12000, "label": "Recommended" },
          { "cover": 1000000, "premium": 22000, "label": "Comprehensive" }
        ]
      },
      "term_cover": { "cover": 5000000, "years": 30, "premium": 8000 },
      "critical_illness": { "cover": 1000000, "years": 20, "premium": 6000 },
      "disability_income": { "monthly_benefit": 30000, "years": 30, "premium": 4000 }
    },
    "next_step": 6
  }
}
```

---

### GET /api/journey/quotes
Generate and return quotes for application.

**Auth**: Customer JWT  
**Query params**: `application_id`  
**Guard**: status must be `needs_done`  
**Note**: First call triggers quote API; subsequent calls return cached quotes from DB.

Response:
```json
{
  "success": true,
  "data": {
    "quotes": [
      {
        "id": "uuid",
        "plan_type": "basic",
        "plan_name": "Star Health Individual Basic",
        "sum_insured": 300000,
        "annual_premium": 8500,
        "gst_amount": 1530,
        "total_premium": 10030,
        "benefits": [
          { "name": "Hospitalization", "description": "Room rent up to ₹3000/day", "limit": "As per policy" },
          { "name": "Day Care", "description": "140+ day care procedures covered", "limit": "Up to SI" }
        ],
        "exclusions": [
          { "name": "Pre-existing conditions", "description": "3 year waiting period" },
          { "name": "Cosmetic surgery", "description": "Not covered" }
        ],
        "waiting_periods": [
          { "condition": "Pre-existing diseases", "days": 1095 },
          { "condition": "Specific diseases (hernia, cataract)", "days": 730 }
        ],
        "riders": [
          { "code": "OPD", "name": "OPD Cover", "annual_premium": 2000, "gst": 360, "total": 2360 },
          { "code": "MATERNITY", "name": "Maternity Benefit", "annual_premium": 3000, "gst": 540, "total": 3540 }
        ],
        "network_hospitals_count": 9800
      },
      { "plan_type": "standard", "..." : "..." },
      { "plan_type": "premium", "...": "..." }
    ]
  }
}
```

---

### POST /api/journey/quotes/select
Select a quote.

**Auth**: Customer JWT  
**Guard**: status must be `needs_done` or `quote_selected` (allow re-selection)

Request:
```json
{
  "application_id": "uuid",
  "quote_id": "uuid",
  "selected_riders": ["OPD"]
}
```
Response:
```json
{
  "success": true,
  "data": {
    "selected_quote_id": "uuid",
    "base_premium": 12000,
    "riders_premium": 2360,
    "final_premium": 14360,
    "next_step": 7
  }
}
```

---

### POST /api/journey/medical
Submit medical questionnaire.

**Auth**: Customer JWT  
**Guard**: status must be `quote_selected`

Request: Full medical questionnaire (see MEDICAL_QUESTIONNAIRE.md for complete field list)
```json
{
  "application_id": "uuid",
  "height_cm": 172,
  "weight_kg": 75,
  "is_smoker": false,
  "alcohol_consumption": "occasional",
  "has_diabetes": false,
  "has_hypertension": true,
  "ped_details": [
    {
      "condition": "hypertension",
      "diagnosis_year": 2020,
      "is_controlled": true,
      "current_treatment": "medication",
      "medications": "Amlodipine 5mg"
    }
  ],
  "has_had_surgery": false,
  "has_family_history": true,
  "family_history": [
    { "relation": "father", "condition": "diabetes", "age_at_onset": 55, "is_alive": true }
  ],
  "is_on_medication": true,
  "current_medications": "Amlodipine 5mg daily",
  "has_existing_health_insurance": false,
  "had_claim_last_3_years": false,
  "was_ever_declined": false,
  "covers_family_members": false,
  "declaration_health_accurate": true
}
```
Response:
```json
{
  "success": true,
  "data": {
    "bmi": 25.37,
    "risk_flags": ["has_ped"],
    "risk_score": 25,
    "biometric_recommended": false,
    "next_step": 8
  }
}
```

---

### POST /api/journey/proposal
Submit proposal form data.

**Auth**: Customer JWT  
**Guard**: status must be `medical_done`

Request:
```json
{
  "application_id": "uuid",
  "proposal_data": {
    "name": "RAHUL SHARMA",
    "dob": "1990-05-15",
    "gender": "male",
    "pan": "ABCDE1234F",
    "mobile": "9876543210",
    "email": "rahul@example.com",
    "address": {
      "line1": "123 MG Road",
      "line2": "Bandra West",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400050"
    },
    "marital_status": "married",
    "occupation": "Software Engineer",
    "occupation_type": "salaried",
    "annual_income": 600000,
    "nominee_name": "Priya Sharma",
    "nominee_relation": "spouse",
    "nominee_dob": "1992-08-20",
    "nominee_share": 100,
    "members": [],
    "declaration_accepted": true,
    "consent_data_sharing": true,
    "consent_health_declaration": true
  }
}
```
Response:
```json
{ "success": true, "data": { "next_step": 9 } }
```

---

### POST /api/journey/verify-id
Verify a government ID via Karza TKYC.

**Auth**: Customer JWT  
**Guard**: status must be `proposal_submitted`

Request:
```json
{
  "application_id": "uuid",
  "id_type": "pan",
  "id_value": "ABCDE1234F",
  "name": "RAHUL SHARMA",
  "dob": "1990-05-15"
}
```
Response:
```json
{
  "success": true,
  "data": {
    "verification_id": "uuid",
    "id_type": "pan",
    "status": "verified",
    "match_score": 95.5,
    "verified_name": "RAHUL SHARMA",
    "is_mock": false
  }
}
```

---

### POST /api/journey/verify-id/complete
Mark ID verification step complete.

**Auth**: Customer JWT

Request: `{ "application_id": "uuid" }`  
Response: `{ "success": true, "data": { "verifications": [...], "next_step": 10 } }`

---

### POST /api/journey/documents/upload
Upload a document.

**Auth**: Customer JWT  
**Content-Type**: `multipart/form-data`

Form fields:
- `application_id`: uuid
- `document_type`: string (aadhaar_front, pan_card, etc.)
- `category`: kyc | financial
- `file`: File (max 10MB, PDF/JPG/PNG/JPEG)

Response:
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "cloudinary_url": "https://res.cloudinary.com/...",
    "ocr_status": "queued"
  }
}
```

---

### GET /api/journey/documents/{docId}/status
Poll OCR processing status.

**Auth**: Customer JWT  
**Query params**: `application_id`

Response:
```json
{
  "success": true,
  "data": {
    "ocr_status": "done",
    "ocr_confidence": 96.2,
    "ocr_result": {
      "name": "RAHUL SHARMA",
      "dob": "15/05/1990",
      "pan_number": "ABCDE1234F"
    }
  }
}
```

---

### POST /api/journey/documents/finalize
Mark document upload step complete.

**Auth**: Customer JWT

Request: `{ "application_id": "uuid" }`  
Response:
```json
{
  "success": true,
  "data": {
    "docs_complete": true,
    "docs_summary": {
      "kyc": ["aadhaar_front", "aadhaar_back", "pan_card", "photograph"],
      "financial": ["bank_statement", "itr"]
    },
    "next_step": 11
  }
}
```

---

### POST /api/journey/biometrics/pivc
Start PIVC session.

**Auth**: Customer JWT

Request: `{ "application_id": "uuid" }`  
Response:
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "pivc_link": "https://pivc.example.com/session/xxx",
    "email_sent": true
  }
}
```

---

### POST /api/journey/biometrics/nuralx
Start NuralX face biometric scan.

**Auth**: Customer JWT

Request: `{ "application_id": "uuid" }`  
Response:
```json
{
  "success": true,
  "data": {
    "scan_id": "uuid",
    "scan_url": "https://scan.nuralx.com/xxx",
    "email_sent_to": "rahul@example.com"
  }
}
```

---

### GET /api/journey/biometrics/status
Poll biometric completion.

**Auth**: Customer JWT  
**Query params**: `application_id`, `type` (pivc|nuralx)

Response (NuralX completed):
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "type": "nuralx",
    "vitals": {
      "heart_rate": 72,
      "respiratory_rate": 16,
      "blood_pressure_systolic": 118,
      "blood_pressure_diastolic": 76,
      "oxygen_saturation": 98,
      "stress_index": 22
    },
    "risk_score": 15,
    "next_step": 12
  }
}
```

---

### POST /api/journey/biometrics/skip
Skip biometrics if not required.

**Auth**: Customer JWT

Request: `{ "application_id": "uuid" }`  
Response: `{ "success": true, "data": { "skipped": true, "next_step": 12 } }`

---

### POST /api/journey/stp
Trigger STP underwriting evaluation.

**Auth**: Customer JWT  
**Guard**: status must be `biometrics_done` or `docs_uploaded`

Request: `{ "application_id": "uuid" }`  
Response:
```json
{
  "success": true,
  "data": {
    "decision": "approved",
    "stp_score": 82,
    "message": "Application approved for straight-through processing.",
    "next_step": "13a"
  }
}
```
OR:
```json
{
  "success": true,
  "data": {
    "decision": "referred",
    "message": "Your application requires additional review.",
    "next_step": "13b"
  }
}
```

---

## Payment APIs

### POST /api/payment/create-order
Create Razorpay payment order.

**Auth**: Customer JWT  
**Guard**: stp_decision must be 'approved' OR uw_decision must be approved variant

Request: `{ "application_id": "uuid" }`  
Response:
```json
{
  "success": true,
  "data": {
    "order_id": "order_xxx",
    "amount_paise": 1436000,
    "amount_inr": 14360,
    "currency": "INR",
    "razorpay_key_id": "rzp_test_xxx",
    "prefill": {
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "contact": "9876543210"
    }
  }
}
```

---

### POST /api/payment/verify
Verify Razorpay signature and issue policy.

**Auth**: Customer JWT

Request:
```json
{
  "application_id": "uuid",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_order_id": "order_xxx",
  "razorpay_signature": "hex_signature"
}
```
Response:
```json
{
  "success": true,
  "data": {
    "payment_verified": true,
    "policy_number": "STAR-2026-00000001",
    "next_step": 15
  }
}
```

---

## Policy APIs

### GET /api/policy/{applicationId}
Get policy details.

**Auth**: Customer JWT

Response:
```json
{
  "success": true,
  "data": {
    "policy_number": "STAR-2026-00000001",
    "plan_name": "Star Health Individual Standard",
    "sum_insured": 500000,
    "total_premium_paid": 14360,
    "policy_start_date": "2026-06-24",
    "policy_end_date": "2027-06-23",
    "insured_name": "RAHUL SHARMA",
    "nominee_name": "Priya Sharma",
    "exclusions": [],
    "policy_document_url": "https://res.cloudinary.com/.../policy.pdf",
    "free_look_expires": "2026-07-09"
  }
}
```

---

### GET /api/policy/{applicationId}/document
Download policy PDF (redirect to signed Cloudinary URL).

**Auth**: Customer JWT  
Response: 302 redirect to signed Cloudinary URL (1-hour expiry)

---

## Quote Calculator (Public)

### GET /api/quotes/calculate
Indicative premium calculation (landing page, no auth).

**Auth**: Public  
**Rate limit**: 10/min per IP

Query params: `age`, `gender`, `sum_insured`, `members`, `city_tier`, `plan_type`, `insurer_slug`

Response:
```json
{
  "success": true,
  "data": {
    "options": [
      { "type": "basic", "sum_insured": 300000, "annual_premium": 8500, "gst": 1530, "total": 10030 },
      { "type": "standard", "sum_insured": 500000, "annual_premium": 12000, "gst": 2160, "total": 14160 },
      { "type": "premium", "sum_insured": 1000000, "annual_premium": 22000, "gst": 3960, "total": 25960 }
    ],
    "disclaimer": "This is an indicative premium. Actual premium may vary based on medical assessment."
  }
}
```

---

## Underwriter Portal APIs

### GET /api/underwriter/stats
Dashboard statistics.

**Auth**: UW/Admin JWT

Response:
```json
{
  "success": true,
  "data": {
    "pending": 12,
    "in_review": 3,
    "approved_today": 5,
    "rejected_today": 1,
    "total_this_month": 89,
    "avg_decision_time_hours": 4.2
  }
}
```

---

### GET /api/underwriter/applications
List applications for UW review.

**Auth**: UW/Admin JWT

Query params:
- `status`: uw_pending | uw_approved | uw_rejected | all (default: uw_pending)
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `search`: string (application_number, name, PAN)
- `sum_insured_min`, `sum_insured_max`
- `created_from`, `created_to`
- `sort_by`: created_at | sum_insured | age (default: created_at)
- `sort_order`: asc | desc (default: desc)

Response:
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "uuid",
        "application_number": "IH-2026-000045",
        "customer_name": "RAHUL SHARMA",
        "mobile_masked": "98****3210",
        "pan_masked": "ABC**1234F",
        "age": 36,
        "gender": "male",
        "sum_insured": 500000,
        "plan_name": "Standard",
        "final_premium": 14360,
        "stp_score": 38,
        "stp_message": "Pre-existing hypertension detected",
        "risk_flags": ["has_ped"],
        "status": "uw_pending",
        "created_at": "2026-06-24T10:30:00Z",
        "days_pending": 1
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 47, "pages": 3 }
  }
}
```

---

### GET /api/underwriter/applications/{id}
Full application details for UW review.

**Auth**: UW/Admin JWT

Response:
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "uuid",
      "application_number": "IH-2026-000045",
      "status": "uw_pending",
      "created_at": "2026-06-24T10:30:00Z"
    },
    "customer": {
      "name": "RAHUL SHARMA",
      "dob": "1990-05-15",
      "age": 36,
      "gender": "male",
      "pan": "ABCDE1234F",
      "mobile": "9876543210",
      "email": "rahul@example.com",
      "address": { "city": "Mumbai", "state": "Maharashtra" }
    },
    "iadore_summary": { "..." },
    "income_profile": { "..." },
    "selected_quote": { "..." },
    "medical_questionnaire": { "..." },
    "id_verifications": [ "..." ],
    "documents": [
      {
        "id": "uuid",
        "document_type": "aadhaar_front",
        "cloudinary_url": "signed_url",
        "ocr_result": { "..." }
      }
    ],
    "biometrics": [ "..." ],
    "stp_result": {
      "decision": "REFERRED",
      "stp_score": 38,
      "message": "Pre-existing hypertension — manual review required",
      "documents_required": []
    },
    "underwriter_actions": []
  }
}
```

---

### POST /api/underwriter/applications/{id}/approve
Approve application (standard, no loading/exclusion).

**Auth**: UW/Admin JWT

Request:
```json
{
  "internal_notes": "Low-risk hypertension, well-controlled.",
  "customer_message": "We are pleased to inform you that your application has been approved."
}
```
Response: `{ "success": true, "data": { "action_id": "uuid", "email_queued": true } }`

---

### POST /api/underwriter/applications/{id}/loading
Approve with premium loading.

**Auth**: UW/Admin JWT

Request:
```json
{
  "loading_type": "percentage",
  "loading_percent": 25,
  "internal_notes": "Hypertension with family history — 25% loading applied.",
  "customer_message": "Your application has been approved with a loading of 25% on the base premium due to disclosed health conditions."
}
```
Response:
```json
{
  "success": true,
  "data": {
    "action_id": "uuid",
    "original_premium": 12000,
    "loading_amount": 3000,
    "revised_premium": 15000,
    "revised_total": 17700,
    "email_queued": true
  }
}
```

---

### POST /api/underwriter/applications/{id}/exclusion
Approve with exclusions.

**Auth**: UW/Admin JWT

Request:
```json
{
  "exclusions": [
    {
      "condition": "Hypertension and related complications",
      "type": "permanent",
      "duration_months": null,
      "notes": "All claims related to hypertension, heart disease, and stroke permanently excluded."
    }
  ],
  "internal_notes": "Pre-existing hypertension — exclusion applied.",
  "customer_message": "Your application has been approved. Please note specific exclusions applicable to your policy."
}
```
Response: `{ "success": true, "data": { "action_id": "uuid", "email_queued": true } }`

---

### POST /api/underwriter/applications/{id}/reject
Reject application.

**Auth**: UW/Admin JWT

Request:
```json
{
  "rejection_reason_code": "high_risk_medical",
  "rejection_reason_text": "Multiple pre-existing conditions present significant underwriting risk.",
  "internal_notes": "3 PEDs including diabetes, hypertension, and heart disease. High risk.",
  "customer_message": "We regret to inform you that we are unable to offer coverage at this time based on the medical information provided."
}
```
Response: `{ "success": true, "data": { "action_id": "uuid", "email_queued": true } }`

---

### POST /api/underwriter/applications/{id}/request-docs
Request additional documents.

**Auth**: UW/Admin JWT

Request:
```json
{
  "requested_documents": [
    {
      "document_type": "medical_report",
      "description": "Recent HbA1c report (within last 3 months)",
      "is_mandatory": true
    },
    {
      "document_type": "other",
      "description": "Doctor's certificate confirming controlled diabetes",
      "is_mandatory": true
    }
  ],
  "customer_message": "To complete the review of your application, we require the following documents.",
  "internal_notes": "Diabetes declared but no lab reports. Need recent HbA1c."
}
```
Response: `{ "success": true, "data": { "action_id": "uuid", "email_queued": true } }`

---

## Admin APIs

### GET /api/admin/insurers
List all insurers.

**Auth**: Super Admin JWT

Response:
```json
{
  "success": true,
  "data": {
    "insurers": [
      {
        "id": "uuid",
        "slug": "star-health",
        "name": "Star Health Insurance",
        "mode": "test",
        "is_active": true,
        "application_count": 145,
        "policy_count": 89,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/admin/insurers
Create new insurer.

**Auth**: Super Admin JWT

Request:
```json
{
  "slug": "niva-bupa",
  "name": "Niva Bupa Health Insurance",
  "logo_url": "https://cdn.example.com/niva-logo.png",
  "config": {
    "primary_color": "#003087",
    "contact_email": "support@nivabupa.com",
    "contact_phone": "1800-200-5544",
    "irdai_registration": "IRDAI/HLT/NBL/P-H/V.I/12/2024-25",
    "gstin": "07AABCN1234H1Z5",
    "financial_docs_threshold_sum_insured": 1000000,
    "biometric_threshold_sum_insured": 2000000,
    "stp_auto_biometric_age": 50
  }
}
```
Response: `{ "success": true, "data": { "insurer_id": "uuid", "slug": "niva-bupa" } }`

---

### PUT /api/admin/insurers/{id}/mode
Toggle insurer mode.

**Auth**: Super Admin JWT

Request: `{ "mode": "live" }`  
Response: `{ "success": true, "data": { "mode": "live" } }`

---

### POST /api/admin/insurers/{id}/credentials
Add/update API credentials for an insurer.

**Auth**: Super Admin JWT

Request:
```json
{
  "api_name": "iadore",
  "credentials": {
    "base_url": "https://api.iadore.com",
    "org_key": "xxx",
    "hmac_key": "yyy",
    "income_api_url": "https://api.iadore.com/income"
  }
}
```
Response: `{ "success": true, "data": { "credential_id": "uuid" } }`

---

## Webhook APIs

### POST /api/webhooks/nuralx
NuralX scan completion callback.

**Auth**: NuralX signature header (`X-NuralX-Signature`)

Request (from NuralX):
```json
{
  "scan_id": "nuralx_xxx",
  "status": "completed",
  "vitals": {
    "heart_rate": 72,
    "respiratory_rate": 16,
    "blood_pressure_systolic": 118,
    "blood_pressure_diastolic": 76,
    "oxygen_saturation": 98,
    "stress_index": 22
  },
  "risk_score": 15
}
```
Response: `{ "success": true }`

---

### POST /api/webhooks/razorpay
Razorpay payment event webhook.

**Auth**: Razorpay signature header (`X-Razorpay-Signature`)

Request (from Razorpay):
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxx",
        "order_id": "order_xxx",
        "amount": 1436000,
        "currency": "INR",
        "status": "captured",
        "method": "upi"
      }
    }
  }
}
```
Response: `{ "success": true }`

Server logic:
1. Verify Razorpay webhook signature
2. Find payment by order_id
3. If status=captured AND signature not yet verified: trigger policy issuance
4. Idempotent: if policy already issued, skip and return 200
