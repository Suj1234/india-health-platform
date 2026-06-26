# White-Label Configuration Specification

---

## 1. Overview

Each insurer on the platform is independently configured. The white-label system isolates:
- Data (all rows tagged with `insurer_id`)
- API credentials (per-insurer, stored in `insurer_api_credentials`)
- Mode (test/live per insurer)
- Product configuration (sum insured slabs, thresholds, feature flags)
- Branding (logo, colors, contact info — used in emails and policy docs)

---

## 2. Insurer Config Object

Stored in `insurers.config` (JSONB column):

```typescript
interface InsurerConfig {
  // ── BRANDING ──
  primary_color: string            // Hex: '#003087'
  secondary_color: string          // Hex: '#ffffff'
  logo_url: string                 // Cloudinary URL of insurer logo
  favicon_url?: string
  
  // ── CONTACT ──
  contact_email: string            // 'support@insurer.com'
  contact_phone: string            // '1800-200-5544'
  website: string                  // 'https://insurer.com'
  grievance_email: string          // For policy documents
  grievance_phone: string
  
  // ── IRDAI / LEGAL ──
  irdai_registration: string       // 'IRDAI/HLT/STAR/P-H/V.I/12/2024-25'
  cin: string                      // Company Identification Number
  gstin: string                    // '27AAACS1234H1Z5'
  registered_office_address: string
  
  // ── PRODUCT THRESHOLDS ──
  financial_docs_threshold_sum_insured: number  // Default: 1000000 (₹10L)
  // Customers with sum insured >= this value must upload financial docs
  
  biometric_threshold_sum_insured: number       // Default: 2000000 (₹20L)
  // Biometrics recommended if sum insured >= this value
  
  stp_auto_biometric_age: number               // Default: 50
  // Biometrics recommended if age >= this value
  
  payment_expiry_hours_stp: number             // Default: 24
  // Hours to complete payment after STP approval
  
  payment_expiry_days_uw: number               // Default: 7
  // Days to complete payment after UW approval
  
  // ── FEATURE FLAGS ──
  skip_needs_analysis: boolean        // Default: false — skip PMW step if insurer doesn't use it
  skip_pivc: boolean                  // Default: false — skip PIVC biometric
  skip_nuralx: boolean                // Default: false — skip NuralX face scan
  require_voter_or_passport: boolean  // Default: false — require additional ID beyond PAN
  
  // ── POLICY SETTINGS ──
  policy_number_prefix: string        // e.g., 'STAR', 'NIVA', 'CARE'
  policy_duration_months: number      // Default: 12 (annual)
  free_look_days: number              // Default: 15 (IRDAI mandated minimum)
  
  // ── SUM INSURED OPTIONS ──
  sum_insured_options: number[]       // [300000, 500000, 1000000, 1500000, 2000000, 5000000]
  
  // ── EXCLUSION PRESETS ──
  standard_exclusions: Array<{
    name: string
    description: string
    waiting_period_days: number
  }>
  
  // ── EMAIL ──
  email_sender_name: string           // 'Star Health Insurance'
  email_reply_to: string              // 'noreply@starhealth.in'
  
  // ── RIDERS AVAILABLE ──
  available_riders: Array<{
    code: string                      // 'OPD', 'MATERNITY', 'ROOM_WAIVER'
    name: string
    description: string
    is_active: boolean
  }>
}
```

---

## 3. API Credentials Per Insurer

Stored in `insurer_api_credentials` table.  
Each row: one insurer + one API service.

### Credential Schemas Per API

```typescript
// iAdore (Perfios)
interface IAdoreCredentials {
  base_url: string
  org_key: string
  hmac_key: string
  income_api_url?: string
}

// Karza (TKYC + OCR — same credentials for both)
interface KarzaCredentials {
  base_url: string       // 'https://testapi.karza.in' or prod
  api_key: string
}

// ProtectMeWell
interface PMWCredentials {
  base_url: string
  api_key: string
}

// Quote API
interface QuoteApiCredentials {
  base_url: string
  api_key: string
  insurer_code?: string  // If quote API needs insurer identification
}

// NuralX
interface NuralXCredentials {
  base_url: string
  client_id: string
  client_secret: string
  callback_url: string   // Must be set to platform's webhook URL
}

// PIVC
interface PIVCCredentials {
  base_url: string
  api_key: string
}

// STP Engine
interface STPCredentials {
  base_url: string
  api_key: string
  insurer_code?: string
}
```

---

## 4. Admin Portal — Insurer Setup Flow

### Step 1: Create Insurer
```
POST /api/admin/insurers
{
  "slug": "star-health",       // URL-safe, permanent once set
  "name": "Star Health and Allied Insurance Company Limited",
  "config": {
    "primary_color": "#e60012",
    "irdai_registration": "IRDAI/HLT/SHL/P-H/V.I/12/2024-25",
    "gstin": "33AABCS1234H1Z5",
    "contact_phone": "1800-425-2255",
    "contact_email": "support@starhealth.in",
    "website": "https://starhealth.in",
    "policy_number_prefix": "STAR",
    "sum_insured_options": [300000, 500000, 1000000, 2000000, 5000000],
    "financial_docs_threshold_sum_insured": 1000000,
    "biometric_threshold_sum_insured": 2000000,
    "stp_auto_biometric_age": 50
  }
}
```

### Step 2: Add API Credentials
```
POST /api/admin/insurers/{id}/credentials
{ "api_name": "iadore", "credentials": { "base_url": "...", "org_key": "...", "hmac_key": "..." } }
{ "api_name": "karza_tkyc", "credentials": { "base_url": "...", "api_key": "..." } }
{ "api_name": "karza_ocr", "credentials": { "base_url": "...", "api_key": "..." } }
{ "api_name": "pmw", "credentials": { "base_url": "...", "api_key": "..." } }
{ "api_name": "quotes", "credentials": { "base_url": "...", "api_key": "..." } }
{ "api_name": "nuralx", "credentials": { ... } }
{ "api_name": "stp", "credentials": { "base_url": "...", "api_key": "..." } }
```

### Step 3: Create Underwriter Users
```
POST /api/admin/users
{
  "name": "Anil Kumar",
  "email": "anil.kumar@starhealth.in",
  "role": "underwriter",
  "insurer_id": "{star_health_insurer_id}",
  "temp_password": "Change@123"    // User must change on first login
}
```

### Step 4: Set Mode
```
PUT /api/admin/insurers/{id}/mode
{ "mode": "live" }
```

---

## 5. Multi-Insurer URL Strategy

Each insurer can be accessed via:

**Option A: Subdomain (Recommended for branding)**
```
star-health.platform.com    → insurer_slug resolved from subdomain
niva-bupa.platform.com      → insurer_slug resolved from subdomain
```

**Option B: Path parameter**
```
platform.com/i/star-health  → insurer_slug from URL path
platform.com/i/niva-bupa
```

**Option C: Custom domain (insurer-provided)**
```
insurance.starhealth.in     → mapped to insurer_slug 'star-health' via DNS CNAME
```

### Slug Resolution Middleware
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  
  // Extract insurer slug from subdomain
  // e.g., star-health.platform.com → 'star-health'
  const subdomain = hostname.split('.')[0]
  
  if (subdomain && subdomain !== 'www' && subdomain !== 'platform') {
    // Inject insurer_slug as header for downstream consumption
    const response = NextResponse.next()
    response.headers.set('x-insurer-slug', subdomain)
    return response
  }
  
  // Default: use path param or env default
}
```

---

## 6. Insurer Branding in Application

### How Branding is Applied
1. Customer visits insurer URL → middleware resolves `insurer_slug`
2. Server fetches insurer config from DB (cached per request)
3. Config injected into Next.js layout as CSS variables and metadata

```typescript
// src/app/(customer)/layout.tsx
const insurer = await getInsurerBySlug(insurerSlug)

return (
  <html>
    <head>
      <title>{insurer.name} — Health Insurance</title>
      <style>{`
        :root {
          --color-primary: ${insurer.config.primary_color};
          --color-secondary: ${insurer.config.secondary_color};
        }
      `}</style>
    </head>
    <body>
      {/* Logo rendered from insurer.config.logo_url */}
      {children}
    </body>
  </html>
)
```

---

## 7. Policy Document Customization Per Insurer

The generated PDF policy document uses insurer config for:
- Header: insurer logo + name + IRDAI registration number
- Footer: GSTIN + registered office + grievance details
- Policy number format: `{config.policy_number_prefix}-{YYYY}-{8-digit-seq}`
- Exclusions: insurer's `standard_exclusions` from config + UW-added exclusions
- Contact section: `contact_phone`, `contact_email`, `grievance_email`

---

## 8. Standard Exclusion Templates

Common standard exclusions that insurers typically configure:

```json
[
  {
    "name": "Pre-existing Diseases",
    "description": "Any disease/condition contracted or existing prior to the commencement of the policy is not covered for the first 48 months of continuous coverage.",
    "waiting_period_days": 1460
  },
  {
    "name": "First 30-Day Waiting Period",
    "description": "All diseases and conditions (except accidents) are not covered during the first 30 days of the policy.",
    "waiting_period_days": 30
  },
  {
    "name": "Specific Disease Waiting Period",
    "description": "Cataracts, benign prostatic hypertrophy, hysterectomy, hernia, hydrocele, piles, fissures, etc. — 24-month waiting period.",
    "waiting_period_days": 730
  },
  {
    "name": "Cosmetic and Aesthetic Procedures",
    "description": "Expenses for cosmetic surgery, beauty treatments, or any aesthetic procedures are not covered.",
    "waiting_period_days": 0
  },
  {
    "name": "Dental Treatment",
    "description": "Dental treatment (other than requiring hospitalization due to accident) is not covered.",
    "waiting_period_days": 0
  },
  {
    "name": "Maternity (unless rider opted)",
    "description": "Expenses related to childbirth, pregnancy complications, and newborn care are not covered unless the maternity rider is purchased.",
    "waiting_period_days": 0
  },
  {
    "name": "Intentional Self-Injury",
    "description": "Expenses arising from attempted suicide or self-inflicted injuries are not covered.",
    "waiting_period_days": 0
  },
  {
    "name": "War and Nuclear Risks",
    "description": "Any condition arising from war, invasion, nuclear/radiological contamination is not covered.",
    "waiting_period_days": 0
  }
]
```
