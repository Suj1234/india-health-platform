# Environment & Mode Strategy

---

## Overview

Two axes control behavior:

```
ENVIRONMENT  ×  MODE
─────────────────────────────────────────────
Local        ×  test   → All external APIs mocked
Local        ×  live   → Real external APIs (fallback to mock if creds missing)
Prod         ×  test   → All external APIs mocked
Prod         ×  live   → Real external APIs (fallback to mock if creds missing)
```

**Environment** = where the code runs (Local / Prod)  
**Mode** = per-insurer setting (test / live) stored in DB  
**Internal APIs** = always real in both envs and modes (no mocking)

---

## Environment: Local

### Setup
File: `.env.local` (in project root, auto-gitignored by Next.js)

```bash
# .env.local — NEVER commit this file
DATABASE_URL=postgres://user:pass@ep-bold-shape-xxx.us-east-2.aws.neon.tech/india_health_db?sslmode=require
NEXTAUTH_SECRET=local_secret_32_chars_minimum_xxx
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=local_jwt_secret_32_chars_minimum_x
APP_DEFAULT_MODE=test

# Razorpay
RAZORPAY_MODE=test
RAZORPAY_TEST_KEY_ID=rzp_test_xxx
RAZORPAY_TEST_KEY_SECRET=xxx
RAZORPAY_LIVE_KEY_ID=
RAZORPAY_LIVE_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=xxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
CLOUDINARY_FOLDER=india-health

# Brevo
BREVO_API_KEY=xxx
BREVO_SENDER_EMAIL=noreply@yourplatform.com
BREVO_SENDER_NAME=Health Insurance Platform

# External APIs (used when insurer mode = 'live')
# Leave empty → auto-fallback to mock for that API
IADORE_BASE_URL=
IADORE_ORG_KEY=
IADORE_HMAC_KEY=
KARZA_BASE_URL=
KARZA_API_KEY=
PMW_BASE_URL=
PMW_API_KEY=
QUOTE_API_URL=
QUOTE_API_KEY=
NURALX_BASE_URL=
NURALX_CLIENT_ID=
NURALX_CLIENT_SECRET=
PIVC_BASE_URL=
PIVC_API_KEY=
STP_API_URL=
STP_API_KEY=
```

### Local Development Commands
```bash
npm run dev          # Start dev server at localhost:3000
npx drizzle-kit push # Push schema changes to Neon DB
npx drizzle-kit studio # Browse DB visually
```

---

## Environment: Prod (Vercel)

### Setup
Configure all variables in: **Vercel Dashboard → Project → Settings → Environment Variables**

Add each variable for the **Production** environment.  
No `.env` files are ever committed.

### Vercel Environment Variables (Production)
```
DATABASE_URL              = postgres://...@...neon.tech/india_health_db?sslmode=require
NEXTAUTH_SECRET           = (32+ random chars, generate with: openssl rand -base64 32)
NEXTAUTH_URL              = https://india-health-platform.vercel.app
JWT_SECRET                = (32+ random chars)
APP_DEFAULT_MODE          = test  ← start in test, flip to live when ready

RAZORPAY_MODE             = test  ← change to 'live' when going production
RAZORPAY_TEST_KEY_ID      = rzp_test_xxx
RAZORPAY_TEST_KEY_SECRET  = xxx
RAZORPAY_LIVE_KEY_ID      = rzp_live_xxx  (add when ready)
RAZORPAY_LIVE_KEY_SECRET  = xxx
RAZORPAY_WEBHOOK_SECRET   = xxx

CLOUDINARY_CLOUD_NAME     = xxx
CLOUDINARY_API_KEY        = xxx
CLOUDINARY_API_SECRET     = xxx
CLOUDINARY_FOLDER         = india-health

BREVO_API_KEY             = xxx
BREVO_SENDER_EMAIL        = noreply@platform.com
BREVO_SENDER_NAME         = Health Insurance

# Platform-level fallback API keys
# Per-insurer keys stored in DB (insurer_api_credentials table)
# These env vars are only used if no insurer-level credential exists
IADORE_BASE_URL           = https://api.iadore.perfios.com
IADORE_ORG_KEY            = platform_level_org_key
IADORE_HMAC_KEY           = platform_level_hmac_key
KARZA_BASE_URL            = https://testapi.karza.in
KARZA_API_KEY             = platform_level_karza_key
# ... etc
```

---

## Mode System (Per Insurer)

### Storage
```sql
insurers.mode = 'test' | 'live'
```

### How Mode is Determined
```typescript
// src/lib/api-router.ts
async function getInsurer(insurerId: string) {
  return db.query.insurers.findFirst({ where: eq(insurers.id, insurerId) })
}

// Mode decision:
// 1. Get insurer from DB
// 2. insurer.mode === 'test' → always mock
// 3. insurer.mode === 'live' → use real API (fallback to mock if creds missing)
```

### Toggle Mode (Admin Action)
```typescript
// Admin clicks "Switch to Live Mode" in admin portal
PUT /api/admin/insurers/{id}/mode
Body: { "mode": "live" }

// This updates insurers.mode in DB
// Takes effect IMMEDIATELY for next API call (no redeploy needed)
// Vercel env vars don't need to change for this
```

---

## The API Router (Core of Mode System)

```typescript
// src/lib/api-router.ts

export type ExternalApiName =
  | 'iadore'
  | 'karza_tkyc'
  | 'karza_ocr'
  | 'pmw'
  | 'quotes'
  | 'nuralx'
  | 'pivc'
  | 'stp'

interface CallOptions<T> {
  insurerId: string
  apiName: ExternalApiName
  applicationId?: string
  realFn: () => Promise<T>
  mockFn: () => T | Promise<T>
}

export async function callExternalAPI<T>(options: CallOptions<T>): Promise<T> {
  const { insurerId, apiName, applicationId, realFn, mockFn } = options

  // 1. Get insurer mode
  const insurer = await db.query.insurers.findFirst({
    where: eq(insurers.id, insurerId)
  })
  if (!insurer) throw new Error(`Insurer ${insurerId} not found`)

  // 2. Get credentials
  const creds = await db.query.insurer_api_credentials.findFirst({
    where: and(
      eq(insurer_api_credentials.insurer_id, insurerId),
      eq(insurer_api_credentials.api_name, apiName),
      eq(insurer_api_credentials.is_active, true)
    )
  })

  // 3. Determine if we should mock
  const forceMock = insurer.mode === 'test'
  const noCredentials = !creds
  const shouldMock = forceMock || noCredentials

  // 4. Execute
  const startTime = Date.now()
  let result: T
  let isMock = shouldMock
  let error: string | null = null

  if (shouldMock) {
    result = await mockFn()
  } else {
    try {
      result = await realFn()
    } catch (err) {
      // Live call failed → fallback to mock
      console.warn(`[api-router] ${apiName} live call failed, using mock fallback:`, err)
      result = await mockFn()
      isMock = true
      error = err instanceof Error ? err.message : String(err)
    }
  }

  // 5. Log the call
  await db.insert(api_call_logs).values({
    application_id: applicationId ?? null,
    insurer_id: insurerId,
    api_name: apiName,
    is_mock: isMock,
    duration_ms: Date.now() - startTime,
    error_message: error,
    request_summary: { mode: insurer.mode, had_credentials: !noCredentials },
    response_summary: { success: !error }
  }).catch(logErr => console.error('[api-router] Failed to log API call:', logErr))

  return result
}
```

### Usage Pattern in Route Handlers
```typescript
// src/app/api/journey/profile/route.ts

import { callExternalAPI } from '@/lib/api-router'
import { realIAdoreCall } from '@/lib/external/iadore'
import { mockIAdoreResponse } from '@/lib/mock/iadore.mock'

const iAdoreResult = await callExternalAPI({
  insurerId: application.insurer_id,
  apiName: 'iadore',
  applicationId: application.id,
  realFn: () => realIAdoreCall({
    pan: application.pan!,
    mobile: application.mobile,
    email: application.email!,
    credentials: creds.credentials  // from insurer_api_credentials
  }),
  mockFn: () => mockIAdoreResponse({ pan: application.pan!, mobile: application.mobile })
})
```

---

## Credential Resolution Order

For each external API call, credentials are resolved in this order:

```
1. insurer_api_credentials table (per-insurer, highest priority)
   ↓ if not found
2. Environment variables (platform-level fallback)
   ↓ if both missing
3. Use mock (regardless of insurer mode)
```

```typescript
// src/lib/external/iadore.ts
export function resolveIAdoreCredentials(
  dbCreds: InsurerApiCredential | null
): IAdoreCredentials | null {
  if (dbCreds?.credentials) {
    return dbCreds.credentials as IAdoreCredentials
  }
  // Fallback to env vars
  if (process.env.IADORE_BASE_URL && process.env.IADORE_ORG_KEY) {
    return {
      base_url: process.env.IADORE_BASE_URL,
      org_key: process.env.IADORE_ORG_KEY,
      hmac_key: process.env.IADORE_HMAC_KEY!
    }
  }
  return null  // → will trigger mock in api-router
}
```

---

## Razorpay Mode (Global, Not Per-Insurer)

Payment mode is NOT per-insurer. It's controlled by a single env var:

```
RAZORPAY_MODE = 'test' | 'live'
```

```typescript
// src/lib/razorpay.ts
function getRazorpayInstance() {
  const isLive = process.env.RAZORPAY_MODE === 'live'
  return new Razorpay({
    key_id: isLive ? process.env.RAZORPAY_LIVE_KEY_ID! : process.env.RAZORPAY_TEST_KEY_ID!,
    key_secret: isLive ? process.env.RAZORPAY_LIVE_KEY_SECRET! : process.env.RAZORPAY_TEST_KEY_SECRET!
  })
}
```

When `RAZORPAY_MODE=test`:
- Use test keys (`rzp_test_xxx`)
- Payments are simulated — no real money charged
- Test cards available from Razorpay docs

When `RAZORPAY_MODE=live`:
- Use live keys (`rzp_live_xxx`)
- Real payments charged

To switch: change `RAZORPAY_MODE` in Vercel dashboard → redeploy (< 60 seconds).

---

## Switching to Live (Checklist)

### Per-Insurer Go-Live Checklist
```
[ ] Insurer API credentials added to insurer_api_credentials table via admin portal
[ ] All APIs tested in test mode with mock data
[ ] Insurer logo and branding configured
[ ] IRDAI product details configured (plan codes, sum insured, waiting periods)
[ ] Underwriter users created for the insurer
[ ] Email templates tested with real Brevo account
[ ] Razorpay test payments working end-to-end
[ ] Policy PDF generation tested
[ ] Admin toggles insurer to live mode via /admin/insurers/{id}
[ ] Run one full test journey in live mode (real APIs, real OTP, test Razorpay payment)
```

### Platform Go-Live Checklist (for real money)
```
[ ] All insurer-level items complete
[ ] Change RAZORPAY_MODE=live in Vercel dashboard
[ ] Add RAZORPAY_LIVE_KEY_ID and RAZORPAY_LIVE_KEY_SECRET in Vercel
[ ] Configure Razorpay webhook URL: https://platform.vercel.app/api/webhooks/razorpay
[ ] Test with real payment (smallest amount)
[ ] UptimeRobot monitoring active on production URL
[ ] Error notifications configured (Vercel logs or custom alerting)
```

---

## Mock Data Standards

All mock responses must use realistic Indian data:

```typescript
// Standards for mock data:
PAN numbers:     Valid format AAAAA9999A — use 'ABCDE1234F' as default
Mobile numbers:  Valid 10-digit starting with 6-9 — use '9876543210'
Aadhaar:         Only last 4 digits ever shown — use 'XXXX XXXX 1234'
Names:           Common Indian names — 'RAHUL SHARMA', 'PRIYA PATEL', etc.
Addresses:       Real Indian cities — Mumbai, Delhi, Bengaluru, Chennai, etc.
Income:          Realistic ranges — ₹3,60,000 to ₹15,00,000/year
Bureau scores:   650–800 range for mock
PAN category:    'P' for individual (most common)
```
