import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import * as schema from './schema'
import { allowInsecureTlsIfEnabled } from '../server-network'

// Windows: fs.rmSync({ recursive }) can fail with ENOTEMPTY due to async OS file-handle release.
// Manual traversal is a reliable fallback.
function removeDir(dir: string) {
  if (!fs.existsSync(dir)) return
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      entry.isDirectory() ? removeDir(p) : fs.unlinkSync(p)
    }
    fs.rmdirSync(dir)
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

    // Pass as file:// URL string — PGlite WASM on Windows fails with a plain Windows path
    // because its internal URL object comes from a different realm than Node's URL class.
    const dataDirUrl = pathToFileURL(dataDir).href

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
      where: eq(schema.insurers.slug, 'careshield-india'),
    })
    if (existing) return

    const [insurer] = await db.insert(schema.insurers).values({
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
    }).returning()
    console.log('[db] Seeded default insurer: careshield-india')

    const insurerId = insurer!.id

    const devUsers = [
      { email: 'admin@careshield.in',          name: 'Platform Admin',    password: 'Admin@1234', role: 'super_admin',    insurerId: null },
      { email: 'insureradmin@careshield.in',    name: 'CareShield Admin',  password: 'IAdmin@123', role: 'insurer_admin',  insurerId },
      { email: 'uw@careshield.in',              name: 'Test Underwriter',  password: 'Uw@12345',   role: 'underwriter',    insurerId },
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
      })
      console.log(`[db] Seeded dev user: ${u.email} (${u.role})`)
    }
  } catch (err) {
    console.error('[db] Failed to seed insurer:', err)
  }
}
