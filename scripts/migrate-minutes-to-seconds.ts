/**
 * Migration: Rename goalie_game_stats.minutes → seconds and convert values.
 *
 * Run with:
 *   export $(cat .env.local | grep -v '^#' | xargs) && npx tsx scripts/migrate-minutes-to-seconds.ts
 *
 * This script:
 * 1. Adds a new `seconds` column
 * 2. Copies minutes * 60 into seconds
 * 3. Drops the old `minutes` column
 */
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log("Checking if migration is needed...")

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'goalie_game_stats'
  `
  const colNames = cols.map((c) => c.column_name)

  if (colNames.includes("seconds")) {
    console.log("Column 'seconds' already exists — migration already applied.")
    return
  }

  if (!colNames.includes("minutes")) {
    console.log("Column 'minutes' not found — unexpected schema state.")
    process.exit(1)
  }

  console.log("Adding 'seconds' column...")
  await sql`ALTER TABLE goalie_game_stats ADD COLUMN seconds integer NOT NULL DEFAULT 0`

  console.log("Converting minutes to seconds...")
  await sql`UPDATE goalie_game_stats SET seconds = minutes * 60`

  console.log("Dropping 'minutes' column...")
  await sql`ALTER TABLE goalie_game_stats DROP COLUMN minutes`

  console.log("Migration complete!")
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
