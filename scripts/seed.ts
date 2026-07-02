/**
 * Seed script — run once after `npm run db:push`
 * Usage: npm run db:seed
 *
 * Creates / updates:
 *   1. Care Shield insurer (slug: care-shield)
 *   2. Superadmin user     (admin@insuretech.in / Admin@1234)
 *   3. Insurer admin user  (admin@careshield.in / Admin@1234, must_change_password)
 *   4. Test underwriter    (uw@careshield.in / Uw@12345)
 */
import { eq, or } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { createDb } from '../src/lib/db/factory'
import { insurers, users } from '../src/lib/db/schema'

async function main() {
  const db = await createDb()
  console.log('🌱  Seeding database…\n')

  // ── 1. Insurer ────────────────────────────────────────────────────────────
  console.log('Upserting insurer: Care Shield (slug: care-shield)…')

  // Migrate from old slug if present
  const [oldSlugRow] = await db
    .select({ id: insurers.id })
    .from(insurers)
    .where(eq(insurers.slug, 'careshield-india'))
    .limit(1)

  if (oldSlugRow) {
    await db
      .update(insurers)
      .set({ slug: 'care-shield' })
      .where(eq(insurers.id, oldSlugRow.id))
    console.log('  ↳ Migrated slug careshield-india → care-shield')
  }

  const [existingInsurer] = await db
    .select({ id: insurers.id })
    .from(insurers)
    .where(eq(insurers.slug, 'care-shield'))
    .limit(1)

  let insurerId: string

  const careShieldConfig = {
    primary_color: '#0D5C63',
    secondary_color: '#ffffff',
    font_family: 'Inter',

    contact_email: 'support@careshield.in',
    contact_phone: '1800-200-3000',
    website: 'https://careshield.in',
    grievance_email: 'grievance@careshield.in',
    grievance_phone: '1800-200-3001',

    irdai_registration: 'IRDAI/HLT/CSH/P-H/V.I/142/2024-25',
    cin: 'U66000MH2024PLC000001',
    gstin: '27AABCC1234H1Z5',
    registered_office_address: '701, Trade Centre, Bandra Kurla Complex, Mumbai - 400 051, Maharashtra',

    financial_docs_threshold_sum_insured: 1000000,
    biometric_threshold_sum_insured: 2000000,
    stp_auto_biometric_age: 50,
    payment_expiry_hours_stp: 24,
    payment_expiry_days_uw: 7,

    skip_needs_analysis: false,
    skip_pivc: false,
    skip_nuralx: false,
    require_voter_or_passport: false,

    policy_number_prefix: 'CARE',
    policy_duration_months: 12,
    free_look_days: 15,

    sum_insured_options: [300000, 500000, 1000000, 1500000, 2000000, 5000000],

    email_sender_name: 'CareShield Insurance',
    email_reply_to: 'noreply@careshield.in',

    available_riders: [
      { code: 'OPD', name: 'OPD Cover', description: 'Outpatient consultation and diagnostics covered up to ₹10,000 per year', is_active: true },
      { code: 'MATERNITY', name: 'Maternity Cover', description: 'Normal delivery ₹50,000 and C-section ₹75,000 after 9-month waiting period', is_active: true },
      { code: 'ROOM_WAIVER', name: 'Room Rent Waiver', description: 'Remove room rent sub-limit — any room category covered', is_active: true },
    ],

    standard_exclusions: [
      { name: 'Pre-existing Diseases', description: 'Any disease existing prior to policy commencement is not covered for 48 months.', waiting_period_days: 1460 },
      { name: 'First 30-Day Waiting Period', description: 'All diseases (except accidents) not covered during first 30 days.', waiting_period_days: 30 },
      { name: 'Specific Disease Waiting Period', description: 'Cataracts, hernia, hydrocele, piles etc. — 24-month waiting period.', waiting_period_days: 730 },
      { name: 'Cosmetic Procedures', description: 'Cosmetic surgery and aesthetic procedures not covered.', waiting_period_days: 0 },
      { name: 'Dental Treatment', description: 'Dental treatment (unless accident requiring hospitalization) not covered.', waiting_period_days: 0 },
      { name: 'Maternity (without rider)', description: 'Maternity expenses not covered unless maternity rider purchased.', waiting_period_days: 0 },
    ],
  }

  if (existingInsurer) {
    await db.update(insurers).set({ config: careShieldConfig, name: 'CareShield Insurance Ltd.' }).where(eq(insurers.id, existingInsurer.id))
    insurerId = existingInsurer.id
    console.log(`  ↳ Updated config (id: ${insurerId})`)
  } else {
    const [insurer] = await db
      .insert(insurers)
      .values({
        slug: 'care-shield',
        name: 'CareShield Insurance Ltd.',
        mode: 'test',
        isActive: true,
        config: careShieldConfig,
      })
      .returning()
    insurerId = insurer!.id
    console.log(`  ↳ Created (id: ${insurerId})`)
  }

  // ── 2. Superadmin ────────────────────────────────────────────────────────
  const superadminEmail = 'admin@insuretech.in'
  console.log(`\nUpserting superadmin: ${superadminEmail}…`)

  const [existingSuperadmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, superadminEmail))
    .limit(1)

  if (existingSuperadmin) {
    await db.update(users).set({ role: 'superadmin', insurerId: null }).where(eq(users.id, existingSuperadmin.id))
    console.log(`  ↳ Already exists, role ensured (id: ${existingSuperadmin.id})`)
  } else {
    const passwordHash = await bcrypt.hash('Admin@1234', 12)
    const [admin] = await db
      .insert(users)
      .values({
        email: superadminEmail,
        name: 'Platform Superadmin',
        passwordHash,
        role: 'superadmin',
        insurerId: null,
        isActive: true,
        mustChangePassword: false,
      })
      .returning()
    console.log(`  ↳ Created (id: ${admin!.id})`)
  }

  // ── 3. Insurer Admin ─────────────────────────────────────────────────────
  const iaEmail = 'admin@careshield.in'
  console.log(`\nUpserting insurer admin: ${iaEmail}…`)

  const [existingIa] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, iaEmail))
    .limit(1)

  if (existingIa) {
    await db.update(users).set({ role: 'insurer_admin', insurerId }).where(eq(users.id, existingIa.id))
    console.log(`  ↳ Already exists (id: ${existingIa.id})`)
  } else {
    const passwordHash = await bcrypt.hash('Admin@1234', 12)
    const [ia] = await db
      .insert(users)
      .values({
        email: iaEmail,
        name: 'CareShield Admin',
        passwordHash,
        role: 'insurer_admin',
        insurerId,
        isActive: true,
        mustChangePassword: true,
      })
      .returning()
    console.log(`  ↳ Created (id: ${ia!.id})`)
  }

  // ── 4. Underwriter ───────────────────────────────────────────────────────
  const uwEmail = 'uw@careshield.in'
  console.log(`\nUpserting underwriter: ${uwEmail}…`)

  const [existingUw] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, uwEmail))
    .limit(1)

  if (existingUw) {
    console.log(`  ↳ Already exists (id: ${existingUw.id})`)
  } else {
    const passwordHash = await bcrypt.hash('Uw@12345', 12)
    const [uw] = await db
      .insert(users)
      .values({
        email: uwEmail,
        name: 'Test Underwriter',
        passwordHash,
        role: 'underwriter',
        insurerId,
        isActive: true,
        mustChangePassword: false,
      })
      .returning()
    console.log(`  ↳ Created (id: ${uw!.id})`)
  }

  // ── Also update any old super_admin role rows ─────────────────────────────
  await db
    .update(users)
    .set({ role: 'superadmin' })
    .where(or(eq(users.role, 'super_admin'), eq(users.role, 'admin')))

  console.log('\n✅  Seed complete!\n')
  console.log('──────────────────────────────────────────────────────────')
  console.log('  Customer URL  : /i/care-shield/apply/1')
  console.log('  Insurer Admin : /i/care-shield/admin')
  console.log('  Superadmin    : /superadmin')
  console.log('')
  console.log('  Superadmin    : admin@insuretech.in / Admin@1234')
  console.log('  Insurer Admin : admin@careshield.in / Admin@1234  (must change)')
  console.log('  Underwriter   : uw@careshield.in / Uw@12345')
  console.log('──────────────────────────────────────────────────────────')
}

main().catch(console.error).finally(() => process.exit(0))
