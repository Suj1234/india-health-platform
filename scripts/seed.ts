/**
 * Seed script — run once after `npm run db:push`
 * Usage: npm run db:seed
 *
 * Creates:
 *   1. CareShield India insurer (slug: careshield-india)
 *   2. Super admin user  (admin@careshield.in / Admin@1234)
 *   3. Test underwriter  (uw@careshield.in  / Uw@12345)
 */
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { createDb } from '../src/lib/db/factory'

import { insurers, users } from '../src/lib/db/schema'

async function main() {
  const db = await createDb()
  console.log('🌱  Seeding database…\n')

  // ── 1. Insurer ────────────────────────────────────────────
  console.log('Creating insurer: CareShield India…')
  const [existingInsurer] = await db
    .select({ id: insurers.id })
    .from(insurers)
    .where(eq(insurers.slug, 'careshield-india'))
    .limit(1)

  let insurerId: string

  if (existingInsurer) {
    insurerId = existingInsurer.id
    console.log(`  ↳ Already exists (id: ${insurerId})`)
  } else {
    const [insurer] = await db
      .insert(insurers)
      .values({
        slug: 'careshield-india',
        name: 'CareShield Insurance Ltd.',
        mode: 'test',
        isActive: true,
        config: {
          irdai_reg_no: '142',
          cin: 'U66000MH2024PLC000001',
          contact_email: 'support@careshield.in',
          contact_phone: '1800-200-3000',
          website: 'https://careshield.in',
          primary_color: '#0D5C63',
          accent_color: '#F4845F',
          free_look_days: 15,
          max_otp_per_journey: 2,
          sum_insured_kyc_threshold: 500000,
        },
      })
      .returning()
    insurerId = insurer!.id
    console.log(`  ↳ Created (id: ${insurerId})`)
  }

  // ── 2. Super Admin user ───────────────────────────────────
  const superAdminEmail = 'admin@careshield.in'
  console.log(`\nCreating super admin: ${superAdminEmail}…`)

  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, superAdminEmail))
    .limit(1)

  if (existingAdmin) {
    console.log(`  ↳ Already exists (id: ${existingAdmin.id})`)
  } else {
    const passwordHash = await bcrypt.hash('Admin@1234', 12)
    const [admin] = await db
      .insert(users)
      .values({
        email: superAdminEmail,
        name: 'Platform Admin',
        passwordHash,
        role: 'super_admin',
        insurerId: null,
        isActive: true,
      })
      .returning()
    console.log(`  ↳ Created (id: ${admin!.id})`)
  }

  // ── 3. Underwriter user ───────────────────────────────────
  const uwEmail = 'uw@careshield.in'
  console.log(`\nCreating underwriter: ${uwEmail}…`)

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
      })
      .returning()
    console.log(`  ↳ Created (id: ${uw!.id})`)
  }

  // ── 4. Insurer Admin user ─────────────────────────────────
  const iaEmail = 'insureradmin@careshield.in'
  console.log(`\nCreating insurer admin: ${iaEmail}…`)

  const [existingIa] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, iaEmail))
    .limit(1)

  if (existingIa) {
    console.log(`  ↳ Already exists (id: ${existingIa.id})`)
  } else {
    const passwordHash = await bcrypt.hash('IAdmin@123', 12)
    const [ia] = await db
      .insert(users)
      .values({
        email: iaEmail,
        name: 'CareShield Admin',
        passwordHash,
        role: 'insurer_admin',
        insurerId,
        isActive: true,
      })
      .returning()
    console.log(`  ↳ Created (id: ${ia!.id})`)
  }

  console.log('\n✅  Seed complete!\n')
  console.log('─────────────────────────────────────────────────')
  console.log('  Insurer slug : careshield-india')
  console.log('  Super Admin  : admin@careshield.in / Admin@1234')
  console.log('  Insurer Admin: insureradmin@careshield.in / IAdmin@123')
  console.log('  Underwriter  : uw@careshield.in / Uw@12345')
  console.log('─────────────────────────────────────────────────')
  console.log('\nNext steps:')
  console.log('  npm run dev')
  console.log('  Open http://localhost:3000         ← Customer journey')
  console.log('  Open http://localhost:3000/underwriter/login ← UW portal')
  console.log('')

  process.exit(0)
}

main().catch((err) => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})
