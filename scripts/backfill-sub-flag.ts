import "./env"
import { rawSql } from "../lib/db"
import { sql } from "drizzle-orm"

// Backfill is_sub=true on adhoc_game_rosters, player_game_stats, goalie_game_stats
// for the legacy "Summer Sub" players (identified by 'sub' in the player name).
// Run once after applying the migration that adds the is_sub columns.

async function backfill() {
  console.log("Backfilling is_sub flag for legacy sub players…")

  const agr = await rawSql(sql`
    UPDATE adhoc_game_rosters AS agr
    SET is_sub = true
    FROM players p
    WHERE p.id = agr.player_id
      AND LOWER(p.name) LIKE '%sub%'
      AND agr.is_sub = false
    RETURNING agr.game_id, agr.player_id
  `)
  console.log(`  adhoc_game_rosters: ${agr.length} row(s) marked is_sub`)

  const pgs = await rawSql(sql`
    UPDATE player_game_stats AS pgs
    SET is_sub = true
    FROM players p
    WHERE p.id = pgs.player_id
      AND LOWER(p.name) LIKE '%sub%'
      AND pgs.is_sub = false
    RETURNING pgs.game_id, pgs.player_id
  `)
  console.log(`  player_game_stats: ${pgs.length} row(s) marked is_sub`)

  const ggs = await rawSql(sql`
    UPDATE goalie_game_stats AS ggs
    SET is_sub = true
    FROM players p
    WHERE p.id = ggs.player_id
      AND LOWER(p.name) LIKE '%sub%'
      AND ggs.is_sub = false
    RETURNING ggs.game_id, ggs.player_id
  `)
  console.log(`  goalie_game_stats: ${ggs.length} row(s) marked is_sub`)

  console.log("Done.")
}

backfill().catch((err) => {
  console.error(err)
  process.exit(1)
})
