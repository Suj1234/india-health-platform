# AGENTS.md — India Health Insurance Platform

## Project Overview

White-label health insurance onboarding platform for the Indian market. Enables insurers to offer a fully digital, STP (Straight-Through Processing) health insurance purchase journey to customers. Built from scratch as a Next.js full-stack application.

## Portals

| Portal | Path | Users | Phase |
|---|---|---|---|
| Customer Portal | `/` | Insurance buyers | Phase 1 |
| Underwriter Portal | `/underwriter` | UW reviewers | Phase 1 |
| Admin/Config Portal | `/admin` | Platform & insurer admins | Phase 1 |
| Agent Portal | `/agent` | Insurance agents | Phase 2 |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Neon PostgreSQL (database: `india_health_db`)
- **ORM**: Drizzle ORM
- **Storage**: Cloudinary (folder: `/india-health/`)
- **Email**: Brevo (Sendinblue)
- **Payment**: Razorpay
- **PDF**: pdf-lib
- **Auth**: NextAuth.js (credentials + JWT)
- **Deployment**: Vercel
- **Monitoring**: UptimeRobot

## Project Structure

```
india-health-platform/
├── src/
│   ├── app/
│   │   ├── (customer)/          # Customer portal pages
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── apply/
│   │   │   │   ├── [step]/
│   │   │   │   │   └── page.tsx # Dynamic step pages
│   │   │   │   └── layout.tsx
│   │   │   ├── payment/
│   │   │   └── policy/
│   │   ├── underwriter/         # Underwriter portal
│   │   │   ├── dashboard/
│   │   │   ├── applications/
│   │   │   │   └── [id]/
│   │   │   └── layout.tsx
│   │   ├── admin/               # Admin portal
│   │   │   ├── insurers/
│   │   │   ├── users/
│   │   │   └── layout.tsx
│   │   └── api/                 # All API routes
│   │       ├── auth/
│   │       ├── journey/
│   │       ├── payment/
│   │       ├── policy/
│   │       ├── underwriter/
│   │       ├── admin/
│   │       └── webhooks/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts        # Drizzle schema
│   │   │   └── index.ts         # DB connection
│   │   ├── external/            # External API clients
│   │   │   ├── iadore.ts
│   │   │   ├── karza.ts
│   │   │   ├── pmw.ts
│   │   │   ├── quotes.ts
│   │   │   ├── nuralx.ts
│   │   │   ├── pivc.ts
│   │   │   └── stp.ts
│   │   ├── mock/                # Mock responses for all external APIs
│   │   │   ├── iadore.mock.ts
│   │   │   ├── karza.mock.ts
│   │   │   ├── pmw.mock.ts
│   │   │   ├── quotes.mock.ts
│   │   │   ├── nuralx.mock.ts
│   │   │   └── stp.mock.ts
│   │   ├── api-router.ts        # Mode-aware API caller (real vs mock)
│   │   ├── cloudinary.ts        # Cloudinary upload helpers
│   │   ├── razorpay.ts          # Razorpay helpers
│   │   ├── brevo.ts             # Email helpers
│   │   ├── pdf.ts               # PDF generation
│   │   ├── otp.ts               # OTP generation & verification
│   │   └── auth.ts              # NextAuth config
│   ├── types/
│   │   ├── application.ts       # Application state types
│   │   ├── api.ts               # API request/response types
│   │   └── insurer.ts           # Insurer config types
│   └── middleware.ts            # Route protection
├── docs/                        # All planning documents
├── .env.local                   # Local env (gitignored)
├── .env.example                 # Template (committed)
├── AGENTS.md                    # This file
└── drizzle.config.ts
```

## Environment & Mode Strategy

### Environments
- **Local**: `.env.local` on developer machine (never committed)
- **Prod**: Vercel dashboard environment variables

### Modes (per environment, per insurer)
- **Test Mode** (`mode: 'test'`): All external API calls use mock responses. Internal APIs always run for real.
- **Live Mode** (`mode: 'live'`): Call real external APIs. If credentials missing for an API → auto-fallback to mock.

### Mode Control
- Stored in `insurers.mode` column in DB (`'test' | 'live'`)
- Each insurer independently toggled via Admin portal
- `APP_DEFAULT_MODE` env var sets the default for new insurers

### API Router Pattern
Every external API call MUST go through `src/lib/api-router.ts`:

```typescript
// NEVER call external APIs directly. Always use callExternalAPI()
import { callExternalAPI } from '@/lib/api-router'

const result = await callExternalAPI({
  insurerId: 'uuid',
  apiName: 'iadore',       // must match a key in ExternalApiName enum
  realFn: () => realIAdoreCall(params),
  mockFn: () => mockIAdoreResponse(params),
})
```

The router checks insurer mode and credential presence, decides real vs mock, logs the call to `api_call_logs` table.

## Coding Standards

### TypeScript
- Strict mode always on (`"strict": true` in tsconfig)
- No `any` type — use `unknown` and narrow
- All API route handlers must have typed request/response
- All DB queries typed via Drizzle schema inference

### API Routes (Next.js)
- All routes in `src/app/api/`
- Every route must validate input with Zod schema
- Every route must return typed JSON response
- Auth check at top of every protected route
- Error responses always follow: `{ success: false, error: string, code?: string }`
- Success responses always follow: `{ success: true, data: T }`

### Database
- All queries via Drizzle ORM — no raw SQL except migrations
- All timestamps in UTC (`TIMESTAMPTZ`)
- All IDs are UUID (`gen_random_uuid()`)
- All monetary values as `DECIMAL(10,2)` in paise or rupees (document which)
- Use `updated_at` trigger on all tables

### External API Clients
- Never import external API clients directly in route handlers
- Always go through `api-router.ts`
- Every client must export both `realCall()` and `mockResponse()` functions
- Mock responses must be realistic (valid PAN format, real-looking names, etc.)
- Log every external API call to `api_call_logs` table (both real and mock)

### File Upload
- All uploads go to Cloudinary under `/india-health/{insurer_slug}/{application_id}/`
- Store `cloudinary_public_id` and `cloudinary_url` in DB, not the file itself
- Max file size: 10MB
- Allowed types: PDF, JPG, JPEG, PNG

### OTP
- Max 2 OTPs per application journey
- OTP 1: Mobile verification at journey start
- OTP 2: Payment authorization after UW approval (non-STP) or direct STP approval
- OTP is 6 digits, expires in 10 minutes
- Max 3 attempts before lockout (30-minute cooldown)
- Store hash of OTP in DB (never plaintext)
- Use Brevo SMS or fallback to email OTP

### Authentication
- Customer: OTP-based (no password)
- Underwriter/Admin: Email + password via NextAuth credentials provider
- JWT tokens, 8-hour expiry for UW/Admin
- Customer session: application_id in JWT, 24-hour expiry
- All `/api/underwriter/*` routes require `role: 'underwriter' | 'admin'`
- All `/api/admin/*` routes require `role: 'admin'`

### Payment
- Always verify Razorpay signature server-side before marking payment successful
- Never trust client-side payment status
- Use `APP_MODE` to select test vs live Razorpay keys (not insurer mode — payment mode is global)
- Webhook endpoint: `/api/webhooks/razorpay`

### Error Handling
- All async functions wrapped in try/catch
- External API failures: log error, return mock if in live mode with missing creds, throw if real call fails
- Payment failures: never auto-retry, require user action
- Database errors: log with full context, return 500 with generic message (never expose DB errors to client)

## Key Business Rules

1. **Journey is linear** — cannot skip steps. Each step validates previous step is complete.
2. **Application is resumable** — customer can close browser and resume from last completed step.
3. **PAN is unique per insurer** — one active application per PAN per insurer at a time.
4. **STP decision is final** — cannot re-run STP on same application. Create new application to retry.
5. **Non-STP**: After UW decision, customer has 7 days to complete payment. After 7 days, application expires.
6. **STP**: Customer has 24 hours to complete payment after STP approval.
7. **Policy issuance**: Only after payment is verified (Razorpay signature check).
8. **Underwriter cannot modify application data** — can only approve/reject/add loading/exclusions.
9. **Medical questionnaire is mandatory** for all health insurance applications.
10. **Minimum KYC**: Aadhaar + PAN mandatory. Additional docs based on sum insured threshold.

## Application Status State Machine

```
initiated
  → otp_verified
    → profiling_done        (iAdore complete)
      → income_done
        → needs_done        (PMW complete)
          → quote_selected
            → medical_done
              → proposal_submitted
                → id_verified
                  → docs_uploaded
                    → biometrics_done   (optional, may skip)
                      → stp_evaluated
                        → [stp_approved] payment_pending → payment_done → policy_issued
                        → [stp_referred] uw_pending
                            → uw_approved → payment_pending → payment_done → policy_issued
                            → uw_rejected → application_closed
                            → uw_more_docs → docs_requested → docs_uploaded → uw_pending
```

## Do Not

- Do not add UI/UX styling decisions in planning docs
- Do not call external APIs directly from React components — always via API routes
- Do not store API keys in code or committed files
- Do not expose internal application IDs in URLs for customers (use short tokens)
- Do not skip Razorpay signature verification
- Do not allow status regression (e.g., going from `policy_issued` back to `payment_pending`)
- Do not hard-code insurer-specific logic — everything must be config-driven

## Reference Documents

- [PRD](./docs/PRD.md) — Product requirements
- [BRD](./docs/BRD.md) — Business requirements
- [Tech Stack](./docs/TECH_STACK.md) — Detailed tech decisions
- [Database Schema](./docs/DATABASE_SCHEMA.md) — All tables and columns
- [Journey Flow](./docs/JOURNEY_FLOW.md) — Screen-by-screen with API calls
- [API Specification](./docs/API_SPECIFICATION.md) — Internal API routes
- [External APIs](./docs/EXTERNAL_APIS.md) — Third-party API integration details
- [Underwriter Portal](./docs/UNDERWRITER_PORTAL.md) — UW portal full spec
- [Environment Strategy](./docs/ENVIRONMENT_STRATEGY.md) — Env/mode management
- [Medical Questionnaire](./docs/MEDICAL_QUESTIONNAIRE.md) — Health questions spec
- [White-Label Config](./docs/WHITE_LABEL_CONFIG.md) — Per-insurer configuration
