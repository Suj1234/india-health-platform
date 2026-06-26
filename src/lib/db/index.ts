import { createDb } from './factory'

type DbInstance = Awaited<ReturnType<typeof createDb>>

declare global {
  // eslint-disable-next-line no-var
  var _dbInstance: DbInstance | undefined
}

// Cache on globalThis so Next.js hot-reload doesn't create a new PGlite connection
// (and leave behind a stale postmaster.pid) on every file change.
if (!globalThis._dbInstance) {
  globalThis._dbInstance = await createDb()
}

export const db = globalThis._dbInstance

export type DB = typeof db
