import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import type { SQL } from "drizzle-orm"
import * as schema from "./schema"

// DB_TARGET selects which connection string to use: "dev" → DATABASE_URL_DEV,
// "prod" → DATABASE_URL_PROD. Falls back to plain DATABASE_URL if unset.
// Default is "prod" because the dev DB is currently behind on schema; flip
// this default once dev is rebuilt.
const target = (process.env.DB_TARGET ?? "prod").toLowerCase()
const targetVar = `DATABASE_URL_${target.toUpperCase()}`
const url = process.env[targetVar] ?? process.env.DATABASE_URL
if (!url) {
  throw new Error(`No database URL found (tried ${targetVar} and DATABASE_URL)`)
}
if (typeof window === "undefined") {
  console.log(`[db] DB_TARGET=${target} (${targetVar in process.env ? targetVar : "DATABASE_URL"})`)
}

export const connection = neon(url)

export const db = drizzle(connection, { schema })

/**
 * Execute raw SQL and return rows with loose typing (like the raw neon driver).
 * Use this for complex queries (CTEs, CROSS JOINs, etc.) where Drizzle's
 * query builder can't express the query.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rawSql(query: SQL): Promise<Record<string, any>[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.execute(query) as any
  return result.rows
}

// Re-export schema for convenience
export { schema }
