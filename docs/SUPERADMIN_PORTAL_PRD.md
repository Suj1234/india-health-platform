# PRD — Multi-Tenant Superadmin & Insurer Admin Portals
## Insuretech Platform

**Version:** 1.0  
**Author:** Sujeet Kumar  
**Domain:** `india-health-platform.vercel.app`  
**Status:** Approved for Development

---

## 1. Overview

Insuretech is a white-label health insurance onboarding platform for the Indian market. Currently it runs a single hardcoded tenant (Care Shield). This initiative makes it fully multi-tenant by:

1. Building a **Superadmin Portal** at `/superadmin` — for the platform operator to create and manage insurers
2. Building an **Insurer Admin Portal** at `/i/[slug]/admin` — for each insurer's team to manage their own branding, config, and users
3. Routing all customer journeys through `/i/[slug]/...` with proper tenant isolation

---

## 2. Domain & URL Architecture

### 2.1 Why Path-Based (not Subdomain)

The deployment domain `india-health-platform.vercel.app` is Vercel-managed and does not support wildcard subdomains. Path-based routing is used for Phase 1. When a custom domain (e.g., `insuretech.in`) is added later, middleware can be switched to subdomain resolution with no other code changes — all downstream code reads from `x-insurer-slug` header regardless.

### 2.2 URL Map

| Portal | URL Pattern | Auth Required |
|---|---|---|
| Superadmin | `/superadmin` | `superadmin` role |
| Superadmin Login | `/superadmin/login` | None |
| Customer Journey | `/i/[slug]/apply/[step]` | OTP session |
| Customer Payment | `/i/[slug]/payment` | OTP session |
| Customer Policy | `/i/[slug]/policy` | OTP session |
| Insurer Admin | `/i/[slug]/admin` | `insurer_admin` role |
| Insurer Admin Login | `/i/[slug]/admin/login` | None |
| Underwriter Portal | `/i/[slug]/underwriter` | `underwriter` role |

### 2.3 Slug Resolution

Next.js middleware extracts the slug from the URL path and injects it as a request header:

```
/i/care-shield/apply/1  →  x-insurer-slug: care-shield
/superadmin             →  x-insurer-slug: __superadmin__
```

All server components and API routes read `x-insurer-slug` — never from query params or request body. Unknown slugs return a branded 404 page.

---

## 3. Actors & Roles

| Role | Portal | Scope |
|---|---|---|
| `superadmin` | `/superadmin` | All insurers, full platform config |
| `insurer_admin` | `/i/[slug]/admin` | Their insurer only |
| `underwriter` | `/i/[slug]/underwriter` | Their insurer's applications only |
| Customer | `/i/[slug]/...` | Their own application only |

**Note:** Existing `admin` role in codebase is renamed to `insurer_admin` throughout.

### 3.1 Permission Matrix

| Action | superadmin | insurer_admin | underwriter |
|---|---|---|---|
| Create / deactivate insurer | ✅ | ❌ | ❌ |
| View all insurers | ✅ | ❌ | ❌ |
| Edit any insurer config | ✅ | ❌ | ❌ |
| Edit own insurer branding | ✅ | ✅ | ❌ |
| Edit own insurer legal details | ✅ | ✅ | ❌ |
| Edit own insurer product config | ✅ | ✅ | ❌ |
| Edit own insurer feature flags | ✅ | ✅ | ❌ |
| View API credentials (masked) | ✅ | ✅ | ❌ |
| Update API credentials | ✅ | ✅ | ❌ |
| Toggle Test ↔ Live | ✅ | ✅ | ❌ |
| Create insurer_admin users | ✅ | ✅ | ❌ |
| Create underwriter users | ✅ | ✅ | ❌ |
| Deactivate users | ✅ | ✅ (own only) | ❌ |
| View global audit log | ✅ | ❌ | ❌ |
| View own insurer audit log | ✅ | ✅ | ❌ |
| Impersonate insurer admin | ✅ | ❌ | ❌ |

---

## 4. Authentication

### 4.1 Superadmin Auth
- Email + password, NextAuth credentials provider
- JWT, 8-hour expiry, `role: superadmin`, `insurer_id: null`
- Login at `/superadmin/login`, redirects to `/superadmin` on success
- Account created directly in DB — no self-registration
- On wrong credentials: generic "Invalid credentials" (never reveal whether email exists)

### 4.2 Insurer Admin Auth
- Email + password, NextAuth credentials provider
- JWT, 8-hour expiry, `role: insurer_admin`, `insurer_id: UUID`
- Login at `/i/[slug]/admin/login`
- Cross-tenant check: `insurer_id` in JWT must match the slug in URL — reject with 403 otherwise
- First login: `must_change_password = true` → redirect to change-password screen before any page
- Password policy: min 8 chars, uppercase + lowercase + digit + special char required

### 4.3 Impersonation
- Superadmin selects "Impersonate" on an `insurer_admin` user
- System creates a new JWT: `role: insurer_admin`, `insurer_id`, `impersonated_by: superadmin_id`, `impersonation_session_id`
- Superadmin is redirected to `/i/[slug]/admin` with this JWT
- Persistent red banner shown: "Impersonating [Name] at [Insurer Name] — Exit"
- All actions during session tagged with `impersonation_session_id` in audit log
- Session expires in 1 hour
- Exit destroys impersonation JWT, returns to `/superadmin`

---

## 5. Superadmin Portal — Screens

**Base path:** `/superadmin`  
**Auth guard:** `role === 'superadmin'`

### 5.1 Insurer List `/superadmin`
- Table: Name, Slug, Mode (Test/Live badge), Status (Active/Inactive), Created Date
- Search by name or slug
- Sort by created date (default desc)
- Row actions: Edit, View Users, Impersonate (select target user), Deactivate/Activate
- CTA: "Add Insurer"

### 5.2 Create Insurer `/superadmin/insurers/new`
Fields (required to save):
- **Insurer Name** — full legal name, 2–200 chars
- **Slug** — auto-suggested from name (lowercase, hyphens), editable, 3–50 chars, unique, validated against reserved words (`admin`, `api`, `www`, `superadmin`, `i`)
- **Mode** — Test (default) / Live radio

On save → creates `insurers` row → redirects to Edit Insurer page for full config.

### 5.3 Edit Insurer `/superadmin/insurers/[id]`
Same tabbed interface as Insurer Admin Portal (Sections 6.2–6.8) but superadmin sees all tabs for any insurer.

Additional superadmin-only section at bottom:
- **Danger Zone**: Deactivate (toggle), Delete (requires typing slug to confirm — soft delete)
- **Slug** shown as read-only (never editable after creation)

### 5.4 Users `/superadmin/insurers/[id]/users`
- Table: Name, Email, Role, Status, Last Login, Created Date
- Actions: Create User, Edit, Reset Password, Deactivate/Reactivate
- Create User: name, email, role (`insurer_admin` or `underwriter`), auto-generates temp password, sends welcome email

### 5.5 Impersonation Flow
From insurer list or user list → "Impersonate" → select target `insurer_admin` user → confirm modal → redirected to `/i/[slug]/admin` with impersonation JWT.

### 5.6 Audit Log `/superadmin/audit`
- Filters: Insurer (all or specific), Action Type, Date Range, Actor
- Columns: Timestamp, Insurer, Actor (name + role), Action, Entity, Field Changed, Old Value (masked for credentials), New Value (masked), IP, Impersonation flag
- Pagination: 50 rows per page
- Export: CSV download

---

## 6. Insurer Admin Portal — Screens

**Base path:** `/i/[slug]/admin`  
**Auth guard:** `role === 'insurer_admin'` AND `insurer_id` matches slug's insurer

### 6.1 Dashboard `/i/[slug]/admin`
- Header: "Welcome, [Name] — [Insurer Full Name]"
- Mode badge: prominent Test/Live indicator
- Setup checklist (visual progress): Logo ✅/❌, Legal details ✅/❌, At least one underwriter ✅/❌, API credentials ✅/❌
- Quick nav cards to each section
- Roadmap: Application stats (total, by status, conversion rate)

### 6.2 Branding `/i/[slug]/admin/branding`

**Logo**
- Upload: JPG/PNG, max 2MB
- Preview shown before save
- Saves to Cloudinary: `/india-health/[slug]/branding/logo.[ext]`
- Stored in `insurers.logo_url` + `config.logo_url`
- Options after upload: Replace, Remove

**Colors**
- Primary Color: hex input + color picker
- Secondary Color: hex input + color picker
- Live preview panel: sample button and card rendered in chosen colors

**Font**
- Searchable Google Font picker (populated from Google Fonts API)
- Preview: renders "Health Insurance Made Simple" in selected font in real time
- Stored in `config.font_family` (e.g., `"Poppins"`)
- Applied via Google Fonts `<link>` tag injected in customer layout

Each sub-section saves independently.

### 6.3 Company Details `/i/[slug]/admin/company`

**Contact**
- Contact Email, Contact Phone (10 digits)
- Website URL
- Grievance Email, Grievance Phone

**Legal & Regulatory**
- IRDAI Registration Number
- CIN (Company Identification Number)
- GSTIN (15 alphanumeric, validated format)
- Registered Office Address (multi-line)

**Email Settings**
- Sender Name (shown in "From" of all outbound emails)
- Reply-To Email

All stored in `config` JSONB. Form saves as one unit per sub-section.

### 6.4 Product Configuration `/i/[slug]/admin/product`

**Sum Insured Options**
- Tag input: add/remove values in Rupees
- Min 2, max 8 options
- Each: positive integer, multiple of 50,000, max ₹5 Cr
- Auto-sorted ascending on save

**Riders**
- Table: Code (immutable), Name, Description, Active toggle
- Add Rider: code (uppercase, no spaces), name, description
- Deactivate: sets `is_active = false` (never deletes — preserves policy history)

**Thresholds**
- Financial Docs Threshold (₹) — default ₹10,00,000
- Biometric Threshold (₹) — default ₹20,00,000
- STP Auto Biometric Age — default 50

**Payment Expiry**
- STP payment window: hours (default 24, range 1–72)
- UW-approved payment window: days (default 7, range 1–30)

**Policy Settings**
- Policy Number Prefix: 2–10 uppercase alphanumeric (e.g., `CARE`)
- Free Look Period: days (default 15, min 15 per IRDAI, max 30)

### 6.5 Feature Flags `/i/[slug]/admin/features`

Toggle switches — changes take effect for new applications only:

| Flag | Default | Description |
|---|---|---|
| `skip_needs_analysis` | Off | Skip PMW income & needs step |
| `skip_pivc` | Off | Do not require PIVC video biometric |
| `skip_nuralx` | Off | Do not run NuralX rPPG face scan |
| `require_voter_or_passport` | Off | Require voter ID or passport beyond PAN + Aadhaar |

Every toggle change logged to audit log immediately.

### 6.6 API Credentials `/i/[slug]/admin/credentials`

One card per API service. Each card shows:
- Service name + description
- Status badge: Configured / Not Configured
- Fields: label + masked value (`••••••[last4]`) or "Not set"
- "Update" → side panel with all fields as plain text inputs (never pre-filled)
- On save: validates required fields, stores in `insurer_api_credentials`, logs to audit (values never logged)

Services:

| Service | Required Fields |
|---|---|
| iAdore (Perfios) | base_url, org_key, hmac_key |
| Karza | base_url, api_key |
| ProtectMeWell (PMW) | base_url, api_key |
| Quote API | base_url, api_key, insurer_code (optional) |
| NuralX | base_url, email, password, callback_url |
| PIVC | base_url, api_key |
| STP Engine | base_url, api_key, insurer_code (optional) |

### 6.7 User Management `/i/[slug]/admin/users`

Same as superadmin user management but scoped to this insurer. Can create `insurer_admin` and `underwriter` only (not `superadmin`).

**Create User flow:**
1. Name, email, role
2. System generates 16-char temp password (mixed case + digits + symbols)
3. Welcome email via Brevo: login URL, temp password, must-change note
4. Record created with `must_change_password = true`

**First login — Change Password:**
- Middleware detects flag → redirect to `/i/[slug]/admin/change-password`
- Requires new password + confirm
- On save: hash updated, flag cleared, redirect to dashboard

### 6.8 Mode Settings `/i/[slug]/admin/settings/mode`

**Test → Live:**
- Pre-flight checklist shown:
  - Logo uploaded
  - Legal details complete (IRDAI, GSTIN, address)
  - At least one API credential configured
  - At least one underwriter created
- Confirmation modal: "Going Live means real API calls and real premiums. Type [insurer name] to confirm."
- On confirm: `insurers.mode = 'live'`, audit log entry

**Live → Test:**
- Warning modal: "Mock responses will be used for all new external API calls. Existing policies are unaffected."
- No checklist required
- On confirm: `insurers.mode = 'test'`, audit log entry

---

## 7. Data Requirements

### 7.1 Schema Changes — `users` Table

```sql
-- Rename role value 'admin' → 'insurer_admin'
-- Add new role values: 'superadmin', 'insurer_admin'
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'insurer_admin';

-- New columns
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
```

`insurer_id` is already nullable — `superadmin` users have `insurer_id = NULL`.

### 7.2 Schema Changes — `insurers` Table

`config` JSONB gains `font_family` field — TypeScript type updated, no DB migration needed.

`logo_url` column already exists. Ensure `config.logo_url` and `insurers.logo_url` are kept in sync on every branding save.

### 7.3 New Table — `audit_logs`

```sql
CREATE TABLE audit_logs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id               UUID REFERENCES insurers(id),
  actor_user_id            UUID NOT NULL REFERENCES users(id),
  actor_role               VARCHAR(20) NOT NULL,
  impersonation_session_id UUID,
  action                   VARCHAR(50) NOT NULL,
  entity_type              VARCHAR(50),
  entity_id                UUID,
  field_changed            VARCHAR(100),
  old_value                TEXT,
  new_value                TEXT,
  ip_address               INET,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`action` values: `create`, `update`, `delete`, `mode_change`, `login`, `impersonate_start`, `impersonate_end`  
`entity_type` values: `insurer`, `user`, `api_credentials`, `feature_flag`, `branding`, `product_config`

### 7.4 New Table — `impersonation_sessions`

```sql
CREATE TABLE impersonation_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_user_id   UUID NOT NULL REFERENCES users(id),
  target_user_id       UUID NOT NULL REFERENCES users(id),
  insurer_id           UUID NOT NULL REFERENCES insurers(id),
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at             TIMESTAMPTZ,
  end_reason           VARCHAR(20),  -- 'user_exit' | 'expired'
  ip_address           INET
);
```

### 7.5 Care Shield Seed

A seed script (`scripts/seed-careshield.ts`) will:
1. Upsert Care Shield insurer row with slug `care-shield` and all current config values
2. Create one `insurer_admin` user for Care Shield with `must_change_password = true`
3. Remove all hardcoded `'careshield-india'` references from source code

---

## 8. Branding System — End to End

1. User visits `/i/care-shield/apply/1`
2. Middleware extracts slug `care-shield`, sets `x-insurer-slug: care-shield` header
3. Customer layout reads header → `getInsurerBySlug('care-shield')` (cached per request)
4. Layout injects:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Poppins" rel="stylesheet">
   <style>
     :root {
       --color-primary: #003087;
       --color-secondary: #ffffff;
       --font-family: 'Poppins', sans-serif;
     }
   </style>
   <title>Care Shield Health Insurance</title>
   ```
5. All components use `var(--color-primary)` — zero hardcoded colors in components

---

## 9. Email Notifications

| Trigger | Recipient | Via |
|---|---|---|
| New insurer_admin or underwriter created | New user | Brevo — welcome email with login URL + temp password |
| Admin resets a user's password | User | Brevo — new temp password |
| Insurer goes Live | Superadmin | Brevo — "Insurer [Name] is now live" |

---

## 10. Non-Functional Requirements

- **Tenant isolation:** Every query in insurer admin portal filters by `insurer_id` from JWT. `insurer_id` never accepted from request body for protected operations.
- **Audit completeness:** Every config change writes an audit log entry before returning the response.
- **Credential security:** API credentials stored encrypted. Never returned in plain text after save. Masked values only (`••••••[last4]`) on read.
- **Slug immutability:** Slug cannot be changed after creation — it is the tenant identifier in URLs and storage paths.
- **Impersonation transparency:** Banner always visible during impersonation. Cannot be dismissed.
- **Performance:** Insurer config fetched once per request via Next.js `cache()` — not re-fetched per component.

---

## 11. Implementation Phases

### Phase 1 — Foundation (Current Sprint)
*Goal: Make routing multi-tenant ready, remove all hardcoding, seed Care Shield*

- [ ] Update `src/middleware.ts` — path-based slug extraction, inject `x-insurer-slug` header
- [ ] Move customer journey routes to `/i/[slug]/...` 
- [ ] Update underwriter portal routes to `/i/[slug]/underwriter/...`
- [ ] Run DB migrations: `users` table changes (roles, `must_change_password`, `last_login_at`)
- [ ] Create `audit_logs` table migration
- [ ] Create `impersonation_sessions` table migration
- [ ] Update Drizzle schema + TypeScript types
- [ ] Update `InsurerConfig` type to include `font_family`
- [ ] Seed script for Care Shield (`scripts/seed-careshield.ts`)
- [ ] Remove all hardcoded `'careshield-india'` references from source code
- [ ] Update `getInsurerBySlug()` to work with new path-based context

### Phase 2 — Superadmin Portal
*Goal: Platform operator can create and manage insurers without touching code*

- [ ] Superadmin layout at `src/app/superadmin/layout.tsx`
- [ ] Superadmin login page + NextAuth guard
- [ ] Insurer list page
- [ ] Create Insurer page
- [ ] Edit Insurer tabbed page (all 6 tabs)
- [ ] User management page per insurer
- [ ] Audit log page with filters

### Phase 3 — Insurer Admin Portal
*Goal: Each insurer's team manages their own config and users*

- [ ] Insurer admin layout at `src/app/i/[slug]/admin/layout.tsx`
- [ ] Insurer admin login + NextAuth guard with cross-tenant check
- [ ] Must-change-password flow
- [ ] Dashboard with setup checklist
- [ ] Branding page (logo upload, colors, Google Font picker)
- [ ] Company details page
- [ ] Product configuration page
- [ ] Feature flags page

### Phase 4 — Advanced Config + Security
*Goal: API credentials, mode management, impersonation, full audit*

- [ ] API credentials page (masked display + update flow)
- [ ] Mode toggle page with pre-flight checklist
- [ ] Impersonation session creation + JWT
- [ ] Impersonation banner component
- [ ] Impersonation exit flow
- [ ] Full audit log in insurer admin portal (scoped to their insurer)
- [ ] Email notifications (welcome, password reset, mode-change alert)

---

## 12. Roadmap (Deferred)

| Item | Reason Deferred |
|---|---|
| Subdomain routing (`[slug].insuretech.in`) | Requires custom domain; `.vercel.app` doesn't support wildcards |
| Custom font upload (.woff2) | Google Fonts covers current needs |
| Application data in insurer admin | Configuration portal first, observability later |
| Cross-insurer analytics in superadmin | Need volume before dashboards are meaningful |
| 2FA for superadmin (TOTP) | High priority for production hardening, Phase 5 |
| Custom domain per insurer (CNAME) | Phase 5 infrastructure work |
| Billing / subscription management | Not needed at current insurer count |
| Agent portal | Phase 2 per original product plan |
