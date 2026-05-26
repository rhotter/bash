import "./env"
import { rawSql } from "../lib/db"
import { sql } from "drizzle-orm"

// Idempotent — applies only the is_sub additions from
// drizzle/0001_ancient_mister_sinister.sql. Skips the other two
// statements in that migration (seasons.enable_sync ADD,
// draft_instances.publish_location DROP) because both reflect
// schema drift that has already been applied to this DB.

async function main() {
  console.log("Adding is_sub columns (idempotent)…")

  await rawSql(sql`
    ALTER TABLE adhoc_game_rosters
    ADD COLUMN IF NOT EXISTS is_sub boolean NOT NULL DEFAULT false
  `)
  console.log("  adhoc_game_rosters.is_sub ✓")

  await rawSql(sql`
    ALTER TABLE player_game_stats
    ADD COLUMN IF NOT EXISTS is_sub boolean NOT NULL DEFAULT false
  `)
  console.log("  player_game_stats.is_sub ✓")

  await rawSql(sql`
    ALTER TABLE goalie_game_stats
    ADD COLUMN IF NOT EXISTS is_sub boolean NOT NULL DEFAULT false
  `)
  console.log("  goalie_game_stats.is_sub ✓")

  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
