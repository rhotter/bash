import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import type { SQL } from "drizzle-orm"
import * as schema from "./schema"

export const connection = neon(process.env.DATABASE_URL!)

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
