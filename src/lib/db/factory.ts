import fs from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import * as schema from './schema'
import { allowInsecureTlsIfEnabled } from '../server-network'

// Windows: rmSync can fail with ENOTEMPTY when PGlite WASM still holds file handles.
// The manual fallback must tolerate ENOENT at every step because the WASM may release
// (and delete) files between our readdir and our individual delete calls.
function removeDir(dir: string) {
  if (!fs.existsSync(dir)) return
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch {
    let entries: fs.Dirent[] = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const p = path.join(dir, entry.name)
      entry.isDirectory() ? removeDir(p) : fs.rmSync(p, { force: true })
    }
    // Use rmSync (recursive+force) instead of rmdirSync — handles both ENOENT and ENOTEMPTY.
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* still locked — createDb will retry */ }
  }
}

allowInsecureTlsIfEnabled()

export async function createDb() {
  const usePglite = process.env.APP_USE_PGLITE === 'true'
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

  if (usePglite && !isBuildPhase) {
    // Use absolute path — PGlite WASM on Windows needs it
    const rawDir = process.env.PGLITE_DATA_DIR || './.local-db/pglite'
    const dataDir = path.resolve(rawDir)
    const migrationsFolder = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations')

    // Stale pid = previous hot-reload didn't shut down cleanly → wipe and recreate
    const pidFile = path.join(dataDir, 'postmaster.pid')
    if (fs.existsSync(pidFile)) {
      console.warn('[db] PGlite: stale lock detected, wiping database directory')
      removeDir(dataDir)
    }

    fs.mkdirSync(dataDir, { recursive: true })

    // Pass the relative path directly — PGlite handles relative paths correctly on Windows.
    // pathToFileURL() produced file:///E:/... which PGlite re-parsed as /E:/... causing
    // fs.mkdirSync to resolve it as E:\E:\... (drive root + absolute path = doubled drive letter).
    const dataDirUrl = rawDir

    let client: PGlite
    try {
      client = await PGlite.create(dataDirUrl)
    } catch (err) {
      // Corrupted WAL etc — wipe and retry once
      console.warn('[db] PGlite: create failed, wiping and retrying:', (err as Error).message)
      removeDir(dataDir)
      fs.mkdirSync(dataDir, { recursive: true })
      client = await PGlite.create(dataDirUrl)
    }

    const db = drizzlePglite(client, { schema })
    await migratePglite(db, { migrationsFolder })

    // Seed default insurer so OTP verification works in dev
    await seedDevInsurer(db)

    return db
  }

  const sql = neon(process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost/placeholder')
  return drizzle(sql, { schema })
}

async function seedDevInsurer(db: Awaited<ReturnType<typeof drizzlePglite<typeof schema>>>) {
  try {
    const existing = await db.query.insurers.findFirst({
      where: eq(schema.insurers.slug, 'care-shield'),
    })
    if (existing) return

    const [insurer] = await db.insert(schema.insurers).values({
      slug: 'care-shield',
      name: 'CareShield Insurance Ltd.',
      mode: 'test',
      isActive: true,
      config: {
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
        registered_office_address: '701, Trade Centre, BKC, Mumbai - 400 051',
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
          { code: 'OPD', name: 'OPD Cover', description: 'Outpatient covered up to ₹10,000/year', is_active: true },
          { code: 'MATERNITY', name: 'Maternity Cover', description: 'Normal ₹50K, C-section ₹75K', is_active: true },
          { code: 'ROOM_WAIVER', name: 'Room Rent Waiver', description: 'Remove room rent sub-limit', is_active: true },
        ],
        standard_exclusions: [],
      },
    }).returning()
    console.log('[db] Seeded default insurer: care-shield')

    const insurerId = insurer!.id

    const devUsers = [
      { email: 'admin@insuretech.in',   name: 'Platform Superadmin', password: 'Admin@1234', role: 'superadmin',    insurerId: null as string | null },
      { email: 'admin@careshield.in',   name: 'CareShield Admin',    password: 'Admin@1234', role: 'insurer_admin', insurerId },
      { email: 'uw@careshield.in',      name: 'Test Underwriter',    password: 'Uw@12345',   role: 'underwriter',   insurerId },
    ]

    for (const u of devUsers) {
      const passwordHash = await bcrypt.hash(u.password, 12)
      await db.insert(schema.users).values({
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        insurerId: u.insurerId,
        isActive: true,
        mustChangePassword: u.role === 'insurer_admin',
      })
      console.log(`[db] Seeded dev user: ${u.email} (${u.role})`)
    }
  } catch (err) {
    console.error('[db] Failed to seed insurer:', err)
  }
}
