# Technical Architecture & Stack
**Product**: India Health Insurance Platform  
**Version**: 1.0  

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    VERCEL (CDN + Serverless)         │
│                                                      │
│  ┌──────────────────┐    ┌────────────────────────┐ │
│  │  Next.js Frontend│    │   Next.js API Routes   │ │
│  │  (React Pages)   │◄──►│   (Serverless Fns)    │ │
│  │                  │    │                        │ │
│  │  /               │    │  /api/auth/*           │ │
│  │  /apply/[step]   │    │  /api/journey/*        │ │
│  │  /underwriter/*  │    │  /api/payment/*        │ │
│  │  /admin/*        │    │  /api/underwriter/*    │ │
│  └──────────────────┘    │  /api/admin/*          │ │
│                          │  /api/webhooks/*       │ │
│                          └────────────┬───────────┘ │
└───────────────────────────────────────┼─────────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            │                           │                           │
            ▼                           ▼                           ▼
   ┌─────────────────┐       ┌─────────────────┐        ┌──────────────────┐
   │  Neon PostgreSQL│       │   Cloudinary    │        │  External APIs   │
   │  india_health_db│       │  /india-health/ │        │                  │
   │                 │       │                 │        │  - iAdore        │
   │  - insurers     │       │  - KYC docs     │        │  - Karza TKYC    │
   │  - applications │       │  - Financial    │        │  - Karza OCR     │
   │  - policies     │       │    docs         │        │  - PMW           │
   │  - payments     │       │  - Policy PDFs  │        │  - Quote API     │
   │  - users        │       │                 │        │  - NuralX        │
   │  - ...          │       └─────────────────┘        │  - PIVC          │
   └─────────────────┘                                  │  - STP Engine    │
                                                        │  - Razorpay      │
                                                        │  - Brevo         │
                                                        └──────────────────┘
```

---

## 2. Technology Decisions

### 2.1 Framework: Next.js 14 (App Router)

**Why Next.js 14 App Router**:
- Single repo for frontend + backend (API routes) → no separate backend service → fits free Vercel tier
- Server components reduce client bundle size
- Built-in API routes handle all backend logic as serverless functions
- No cold start issue compared to Render free tier
- App Router supports streaming responses for long-running API calls (iAdore, STP)

**Key Next.js Features Used**:
- App Router (`src/app/`) for all pages and API routes
- Server Components for initial data fetching
- Client Components for interactive forms
- Route Handlers (`route.ts`) for all API endpoints
- Middleware for auth protection on all `/underwriter` and `/admin` routes
- Streaming / `ReadableStream` for SSE progress updates

### 2.2 Language: TypeScript (Strict)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### 2.3 Database: Neon PostgreSQL

**Why Neon**:
- Already in use; free tier supports this volume
- Serverless PostgreSQL — HTTP-based connections work well with Vercel serverless
- Branching for dev/test isolation

**Connection Strategy**:
- Use `@neondatabase/serverless` driver (HTTP-based, no connection pool needed)
- Pool via Drizzle: `neon(process.env.DATABASE_URL)` with `drizzle()` wrapper
- No `pg` connection pool needed (serverless functions are stateless)

```typescript
// src/lib/db/index.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

### 2.4 ORM: Drizzle ORM

**Why Drizzle**:
- Type-safe SQL builder
- No magic — generated queries are readable SQL
- Works with Neon serverless driver
- Migration via `drizzle-kit`
- Schema defined in TypeScript, types inferred automatically

### 2.5 Storage: Cloudinary

**Why Cloudinary**:
- Already in use with existing credentials
- Free tier: 25GB storage, sufficient for this volume
- Supports PDF and image uploads
- Folder-based isolation: `/india-health/{insurer_slug}/{application_id}/`
- Built-in URL signing for secure access

**Upload Pattern**:
- Upload from server-side API route (never directly from browser)
- Return `public_id` and `secure_url` to store in DB
- Documents accessed via signed URLs with 1-hour expiry

### 2.6 Email: Brevo

**Why Brevo**:
- Already in use in existing project (`BREVO_API_KEY` visible in Render env)
- Free tier: 300 emails/day — sufficient for this volume
- Supports transactional email templates
- SMS OTP support (or email fallback OTP)

**Email Types**:
- OTP delivery (mobile SMS or email fallback)
- Application under review notification
- UW decision notification (approved/rejected/more docs)
- Payment link (post-UW approval)
- Policy document delivery

### 2.7 Payment: Razorpay

**Why Razorpay**:
- Most popular payment gateway in India
- Supports health insurance payments
- Test mode keys available immediately
- Node.js SDK: `razorpay`
- Webhook for payment confirmation

**Integration Pattern**:
1. Server: `POST /api/payment/create-order` → Razorpay order API → return `order_id`
2. Client: Load Razorpay checkout with `order_id`
3. Client: On payment success → call `POST /api/payment/verify` with `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`
4. Server: HMAC-SHA256 verify signature → if valid → issue policy

### 2.8 Authentication: NextAuth.js v5

**Why NextAuth**:
- Well-maintained, works with App Router
- Credentials provider for UW/Admin (email + password)
- JWT strategy for stateless auth (serverless friendly)
- Middleware integration for route protection

**Auth Strategies by Portal**:
- Customer: Custom OTP-based auth (NOT NextAuth) → JWT stored in httpOnly cookie
- Underwriter: NextAuth credentials → JWT, `role: 'underwriter'`, `insurer_id`
- Admin: NextAuth credentials → JWT, `role: 'admin'`

### 2.9 PDF Generation: pdf-lib

**Why pdf-lib**:
- Pure JavaScript (no Chromium/Puppeteer) → works in Vercel serverless
- Supports custom layouts for policy document
- Can embed custom fonts for Indian language support (Phase 2)

**Policy PDF Contents**:
- Page 1: Policy summary (number, insured, premium, dates)
- Page 2: Coverage details (sum insured, benefits)
- Page 3: Exclusions
- Page 4: Terms and IRDAI grievance details

### 2.10 Validation: Zod

All API route inputs validated with Zod schemas:
```typescript
const startApplicationSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  insurer_slug: z.string().min(1),
})
```

### 2.11 HTTP Client: Native fetch

- Node.js 18+ native `fetch` — no need for axios
- Use `AbortController` for timeouts on external API calls
- All external calls via `src/lib/api-router.ts` wrapper

---

## 3. Folder Structure (Detailed)

```
india-health-platform/
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # Root layout
│   │   ├── (customer)/                     # Customer portal route group
│   │   │   ├── layout.tsx                  # Customer layout (insurer branding)
│   │   │   ├── page.tsx                    # Landing page
│   │   │   ├── apply/
│   │   │   │   ├── layout.tsx              # Application flow layout (progress bar)
│   │   │   │   └── [step]/
│   │   │   │       └── page.tsx            # Steps 1-12 dynamic
│   │   │   ├── payment/
│   │   │   │   └── page.tsx                # Razorpay checkout
│   │   │   ├── policy/
│   │   │   │   └── page.tsx                # Policy issued success
│   │   │   └── resume/
│   │   │       └── page.tsx                # Resume after UW (from email link)
│   │   │
│   │   ├── underwriter/
│   │   │   ├── layout.tsx                  # UW portal layout (sidebar nav)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                # Stats + application list
│   │   │   └── applications/
│   │   │       ├── page.tsx                # Application list
│   │   │       └── [id]/
│   │   │           └── page.tsx            # Application review detail
│   │   │
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── insurers/
│   │   │   │   ├── page.tsx                # List insurers
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx            # Create insurer
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx            # Edit insurer + credentials
│   │   │   └── users/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── send-otp/route.ts
│   │       │   ├── verify-otp/route.ts
│   │       │   ├── [...nextauth]/route.ts  # NextAuth for UW/Admin
│   │       │   └── logout/route.ts
│   │       ├── journey/
│   │       │   ├── start/route.ts          # POST: create application
│   │       │   ├── profile/
│   │       │   │   ├── route.ts            # POST: submit PAN, trigger iAdore
│   │       │   │   └── status/route.ts     # GET: poll iAdore
│   │       │   ├── income/route.ts         # POST: submit income
│   │       │   ├── needs/route.ts          # GET: PMW needs analysis
│   │       │   ├── quotes/
│   │       │   │   ├── route.ts            # GET: generate quotes
│   │       │   │   └── select/route.ts     # POST: select quote
│   │       │   ├── medical/route.ts        # POST: medical questionnaire
│   │       │   ├── proposal/route.ts       # POST: proposal data
│   │       │   ├── verify-id/route.ts      # POST: TKYC
│   │       │   ├── documents/
│   │       │   │   ├── upload/route.ts     # POST: upload doc
│   │       │   │   ├── [docId]/
│   │       │   │   │   └── status/route.ts # GET: OCR status
│   │       │   │   └── finalize/route.ts   # POST: mark docs done
│   │       │   ├── biometrics/
│   │       │   │   ├── pivc/route.ts       # POST: start PIVC
│   │       │   │   ├── nuralx/route.ts     # POST: start NuralX
│   │       │   │   └── status/route.ts     # GET: poll biometric
│   │       │   └── stp/route.ts            # POST: run STP
│   │       ├── payment/
│   │       │   ├── create-order/route.ts   # POST: Razorpay order
│   │       │   └── verify/route.ts         # POST: verify + issue policy
│   │       ├── policy/
│   │       │   ├── issue/route.ts          # POST: generate policy
│   │       │   └── [id]/
│   │       │       ├── route.ts            # GET: policy details
│   │       │       └── document/route.ts   # GET: PDF download
│   │       ├── quotes/
│   │       │   └── calculate/route.ts      # GET: public quote calculator
│   │       ├── underwriter/
│   │       │   ├── applications/
│   │       │   │   ├── route.ts            # GET: list applications
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts        # GET: full application
│   │       │   │       ├── approve/route.ts
│   │       │   │       ├── reject/route.ts
│   │       │   │       ├── loading/route.ts
│   │       │   │       ├── exclusion/route.ts
│   │       │   │       └── request-docs/route.ts
│   │       │   └── stats/route.ts          # GET: dashboard stats
│   │       ├── admin/
│   │       │   ├── insurers/
│   │       │   │   ├── route.ts            # GET list, POST create
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts        # GET, PUT update
│   │       │   │       ├── mode/route.ts   # PUT: toggle mode
│   │       │   │       └── credentials/route.ts # POST: add API creds
│   │       │   └── users/route.ts
│   │       └── webhooks/
│   │           ├── nuralx/route.ts         # POST: NuralX callback
│   │           └── razorpay/route.ts       # POST: payment webhook
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                    # Drizzle + Neon init
│   │   │   ├── schema.ts                   # All table definitions
│   │   │   └── migrations/                 # Drizzle migration files
│   │   ├── external/                       # External API real implementations
│   │   │   ├── iadore.ts
│   │   │   ├── karza-tkyc.ts
│   │   │   ├── karza-ocr.ts
│   │   │   ├── pmw.ts
│   │   │   ├── quotes.ts
│   │   │   ├── nuralx.ts
│   │   │   ├── pivc.ts
│   │   │   └── stp.ts
│   │   ├── mock/                           # Mock responses (realistic data)
│   │   │   ├── iadore.mock.ts
│   │   │   ├── karza-tkyc.mock.ts
│   │   │   ├── karza-ocr.mock.ts
│   │   │   ├── pmw.mock.ts
│   │   │   ├── quotes.mock.ts
│   │   │   ├── nuralx.mock.ts
│   │   │   ├── pivc.mock.ts
│   │   │   └── stp.mock.ts
│   │   ├── api-router.ts                   # Mode-aware API router
│   │   ├── cloudinary.ts
│   │   ├── razorpay.ts
│   │   ├── brevo.ts
│   │   ├── pdf.ts
│   │   ├── otp.ts
│   │   └── auth.ts
│   │
│   ├── types/
│   │   ├── application.ts
│   │   ├── insurer.ts
│   │   ├── api-requests.ts
│   │   ├── api-responses.ts
│   │   └── external-apis.ts
│   │
│   └── middleware.ts                       # Route auth protection
│
├── docs/                                   # All planning documents
├── public/                                 # Static assets
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
├── .env.example
├── .env.local                             # GITIGNORED
└── CLAUDE.md
```

---

## 4. Key Libraries

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "drizzle-orm": "^0.31.0",
    "@neondatabase/serverless": "^0.9.0",
    "next-auth": "^5.0.0",
    "zod": "^3.23.0",
    "razorpay": "^2.9.0",
    "cloudinary": "^2.3.0",
    "pdf-lib": "^1.17.0",
    "@sib-api-v3-sdk/core": "^8.0.0",
    "jose": "^5.2.0",
    "bcryptjs": "^2.4.3",
    "crypto": "built-in"
  },
  "devDependencies": {
    "drizzle-kit": "^0.22.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/bcryptjs": "^2.4.6"
  }
}
```

---

## 5. Environment Variables (Complete List)

> Full template in `.env.example`

### App Config
- `DATABASE_URL` — Neon connection string for `india_health_db`
- `NEXTAUTH_SECRET` — 32+ char random string for NextAuth JWT signing
- `NEXTAUTH_URL` — full URL of the app (e.g., `https://india-health.vercel.app`)
- `APP_DEFAULT_MODE` — `test` or `live` (default for new insurers)
- `JWT_SECRET` — separate secret for customer OTP JWTs

### Payment
- `RAZORPAY_MODE` — `test` or `live` (global, not per-insurer)
- `RAZORPAY_TEST_KEY_ID` — `rzp_test_xxx`
- `RAZORPAY_TEST_KEY_SECRET` — test secret
- `RAZORPAY_LIVE_KEY_ID` — `rzp_live_xxx` (empty until live)
- `RAZORPAY_LIVE_KEY_SECRET` — (empty until live)
- `RAZORPAY_WEBHOOK_SECRET` — for webhook signature verification

### Storage
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` — `india-health` (prefix folder)

### Email
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL` — `noreply@[insurer-domain]` or platform email
- `BREVO_SENDER_NAME`

### External APIs (stored in DB per insurer — these are FALLBACK platform-level keys)
- `IADORE_BASE_URL`
- `IADORE_ORG_KEY`
- `IADORE_HMAC_KEY`
- `KARZA_BASE_URL`
- `KARZA_API_KEY`
- `PMW_BASE_URL`
- `PMW_API_KEY`
- `QUOTE_API_URL`
- `QUOTE_API_KEY`
- `NURALX_BASE_URL`
- `NURALX_CLIENT_ID`
- `NURALX_CLIENT_SECRET`
- `PIVC_BASE_URL`
- `PIVC_API_KEY`
- `STP_API_URL`
- `STP_API_KEY`

### Internal
- `CRON_SECRET` — for any scheduled tasks (cleanup, expiry)

---

## 6. API Route Security Pattern

```typescript
// Every protected API route follows this pattern
import { verifyCustomerToken } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({ /* ... */ })

export async function POST(request: Request) {
  // 1. Auth check
  const session = await verifyCustomerToken(request)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  // 2. Input validation
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ success: false, error: parsed.error.message }, { status: 400 })

  // 3. Business logic
  try {
    const result = await doBusinessLogic(parsed.data)
    return Response.json({ success: true, data: result })
  } catch (err) {
    console.error('[route] error:', err)
    return Response.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
```

---

## 7. External API Router Pattern

```typescript
// src/lib/api-router.ts
export type ExternalApiName =
  | 'iadore' | 'karza_tkyc' | 'karza_ocr'
  | 'pmw' | 'quotes' | 'nuralx' | 'pivc' | 'stp'

export async function callExternalAPI<T>({
  insurerId,
  apiName,
  applicationId,
  realFn,
  mockFn,
}: {
  insurerId: string
  apiName: ExternalApiName
  applicationId?: string
  realFn: () => Promise<T>
  mockFn: () => T
}): Promise<T> {
  const insurer = await getInsurerById(insurerId)
  const credentials = await getInsurerCredentials(insurerId, apiName)
  
  const shouldUseMock =
    insurer.mode === 'test' ||
    !credentials ||
    !credentials.is_active

  const startTime = Date.now()
  let result: T
  let isMock = shouldUseMock

  try {
    result = shouldUseMock ? mockFn() : await realFn()
  } catch (err) {
    // Real call failed — fallback to mock
    console.warn(`[api-router] ${apiName} real call failed, falling back to mock:`, err)
    result = mockFn()
    isMock = true
  }

  // Log every call
  await logApiCall({
    application_id: applicationId,
    api_name: apiName,
    is_mock: isMock,
    duration_ms: Date.now() - startTime,
  })

  return result
}
```

---

## 8. Deployment Architecture

```
Git push to main
    ↓
Vercel auto-deploy
    ↓
Build: next build (TypeScript compile + bundle)
    ↓
Deploy: Vercel CDN + Serverless functions
    ↓
Env vars injected from Vercel dashboard

Database migrations:
  Run manually via: npx drizzle-kit migrate
  (or via Vercel build command)
```

---

## 9. Performance Considerations

### Vercel Serverless Limits (Hobby Plan)
- Function timeout: 10 seconds
- Memory: 1024MB
- Response size: 4.5MB

### Long-Running Operations Strategy
All external API calls that take > 5 seconds use an async job pattern:
1. Start job → return `job_id` immediately (< 1s response)
2. Client polls `GET /api/journey/{step}/status?jobId=xxx` every 3 seconds
3. Server checks DB for job completion → returns result when ready

This keeps individual API route invocations well under the 10s timeout.

### Database Connection
- Use `@neondatabase/serverless` HTTP driver (not TCP)
- No connection pool management needed (serverless stateless)
- Each function invocation opens HTTP connection → Neon handles pooling

---

## 10. Security Architecture

### Input Validation
- All inputs validated with Zod before processing
- File uploads: MIME type + magic bytes checked server-side

### Authentication Layers
- Customer: OTP → signed JWT (HS256, 24h expiry) in httpOnly cookie
- UW/Admin: NextAuth credential → signed JWT (HS256, 8h expiry) in httpOnly cookie
- Webhook endpoints: signature-based verification (Razorpay HMAC, NuralX secret)

### Data Protection
- API keys stored in Neon DB (`insurer_api_credentials` table)
- Application data isolated by `insurer_id`
- Customer documents accessed only via signed Cloudinary URLs (1-hour expiry)
- PII masked in logs (last 4 of PAN, masked mobile)

### Rate Limiting
- OTP send: max 3 requests per mobile per hour (tracked in `otp_logs`)
- Quote calculator: max 10 requests per IP per minute
- Implemented via DB-checked counters (no Redis needed at this volume)
