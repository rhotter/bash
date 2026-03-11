/**
 * Benchmark: raw neon driver vs Drizzle rawSql
 *
 * Runs identical queries through both the old neon tagged template
 * and the new Drizzle db.execute() path, comparing latency.
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { sql } from "drizzle-orm"

const connection = neon(process.env.DATABASE_URL!)
const db = drizzle(connection)

// Raw neon driver (old approach)
async function rawNeon(query: TemplateStringsArray, ...params: unknown[]) {
  return connection(query, ...params)
}

// Drizzle rawSql (new approach)
async function rawSql(query: ReturnType<typeof sql>) {
  const result = await db.execute(query) as any
  return result.rows
}

const SEASON_ID = "2025-2026"
const WARMUP = 2
const ITERATIONS = 5

interface BenchResult {
  name: string
  neonMs: number[]
  drizzleMs: number[]
}

async function bench(name: string, neonFn: () => Promise<any>, drizzleFn: () => Promise<any>): Promise<BenchResult> {
  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    await neonFn()
    await drizzleFn()
  }

  const neonMs: number[] = []
  const drizzleMs: number[] = []

  for (let i = 0; i < ITERATIONS; i++) {
    const t1 = performance.now()
    await neonFn()
    neonMs.push(performance.now() - t1)

    const t2 = performance.now()
    await drizzleFn()
    drizzleMs.push(performance.now() - t2)
  }

  return { name, neonMs, drizzleMs }
}

function median(arr: number[]) {
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function avg(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

async function main() {
  const results: BenchResult[] = []

  // 1. Simple select
  results.push(await bench(
    "Simple SELECT 1",
    () => rawNeon`SELECT 1 as val`,
    () => rawSql(sql`SELECT 1 as val`),
  ))

  // 2. Games list (main page query)
  results.push(await bench(
    "Games list (season)",
    () => rawNeon`
      SELECT g.id, g.date, g.time, g.home_score, g.away_score,
        g.status, g.is_overtime, g.is_playoff, g.location, g.has_boxscore,
        ht.name as home_team, ht.slug as home_slug,
        awt.name as away_team, awt.slug as away_slug
      FROM games g
      JOIN teams ht ON g.home_team = ht.slug
      JOIN teams awt ON g.away_team = awt.slug
      WHERE g.season_id = ${SEASON_ID}
      ORDER BY g.date ASC
    `,
    () => rawSql(sql`
      SELECT g.id, g.date, g.time, g.home_score, g.away_score,
        g.status, g.is_overtime, g.is_playoff, g.location, g.has_boxscore,
        ht.name as home_team, ht.slug as home_slug,
        awt.name as away_team, awt.slug as away_slug
      FROM games g
      JOIN teams ht ON g.home_team = ht.slug
      JOIN teams awt ON g.away_team = awt.slug
      WHERE g.season_id = ${SEASON_ID}
      ORDER BY g.date ASC
    `),
  ))

  // 3. Player stats (aggregation)
  results.push(await bench(
    "Player stats (aggregation)",
    () => rawNeon`
      SELECT p.id, p.name,
        COUNT(DISTINCT pgs.game_id)::int as gp,
        SUM(pgs.goals)::int as goals, SUM(pgs.assists)::int as assists,
        SUM(pgs.points)::int as points
      FROM players p
      JOIN player_game_stats pgs ON p.id = pgs.player_id
      JOIN games g ON pgs.game_id = g.id AND g.season_id = ${SEASON_ID} AND NOT g.is_playoff
      GROUP BY p.id, p.name
      ORDER BY points DESC, goals DESC
    `,
    () => rawSql(sql`
      SELECT p.id, p.name,
        COUNT(DISTINCT pgs.game_id)::int as gp,
        SUM(pgs.goals)::int as goals, SUM(pgs.assists)::int as assists,
        SUM(pgs.points)::int as points
      FROM players p
      JOIN player_game_stats pgs ON p.id = pgs.player_id
      JOIN games g ON pgs.game_id = g.id AND g.season_id = ${SEASON_ID} AND NOT g.is_playoff
      GROUP BY p.id, p.name
      ORDER BY points DESC, goals DESC
    `),
  ))

  // 4. All-time stats with CTE
  results.push(await bench(
    "All-time stats (CTE + FULL OUTER JOIN)",
    () => rawNeon`
      WITH game_stats AS (
        SELECT pgs.player_id,
          COUNT(DISTINCT pgs.game_id)::int as gp,
          SUM(pgs.points)::int as points
        FROM player_game_stats pgs
        JOIN games g ON pgs.game_id = g.id AND NOT g.is_playoff
        JOIN seasons s ON g.season_id = s.id AND s.season_type = 'fall'
        GROUP BY pgs.player_id
      ), hist_stats AS (
        SELECT player_id, SUM(gp)::int as gp, SUM(points)::int as points
        FROM player_season_stats WHERE NOT is_playoff
        GROUP BY player_id
      )
      SELECT
        COALESCE(gs.player_id, hs.player_id) as player_id,
        COALESCE(gs.gp, 0) + COALESCE(hs.gp, 0) as gp,
        COALESCE(gs.points, 0) + COALESCE(hs.points, 0) as points
      FROM game_stats gs
      FULL OUTER JOIN hist_stats hs ON gs.player_id = hs.player_id
      ORDER BY points DESC
      LIMIT 20
    `,
    () => rawSql(sql`
      WITH game_stats AS (
        SELECT pgs.player_id,
          COUNT(DISTINCT pgs.game_id)::int as gp,
          SUM(pgs.points)::int as points
        FROM player_game_stats pgs
        JOIN games g ON pgs.game_id = g.id AND NOT g.is_playoff
        JOIN seasons s ON g.season_id = s.id AND s.season_type = 'fall'
        GROUP BY pgs.player_id
      ), hist_stats AS (
        SELECT player_id, SUM(gp)::int as gp, SUM(points)::int as points
        FROM player_season_stats WHERE NOT is_playoff
        GROUP BY player_id
      )
      SELECT
        COALESCE(gs.player_id, hs.player_id) as player_id,
        COALESCE(gs.gp, 0) + COALESCE(hs.gp, 0) as gp,
        COALESCE(gs.points, 0) + COALESCE(hs.points, 0) as points
      FROM game_stats gs
      FULL OUTER JOIN hist_stats hs ON gs.player_id = hs.player_id
      ORDER BY points DESC
      LIMIT 20
    `),
  ))

  // 5. Standings (CROSS JOIN LATERAL)
  results.push(await bench(
    "Standings (CROSS JOIN LATERAL)",
    () => rawNeon`
      SELECT t.team_slug,
        SUM(CASE
          WHEN g.home_team = t.team_slug AND g.home_score > g.away_score AND NOT g.is_overtime THEN 3
          WHEN g.away_team = t.team_slug AND g.away_score > g.home_score AND NOT g.is_overtime THEN 3
          WHEN g.home_team = t.team_slug AND g.home_score > g.away_score AND g.is_overtime THEN 2
          WHEN g.away_team = t.team_slug AND g.away_score > g.home_score AND g.is_overtime THEN 2
          WHEN g.home_team = t.team_slug AND g.home_score < g.away_score AND g.is_overtime THEN 1
          WHEN g.away_team = t.team_slug AND g.away_score < g.home_score AND g.is_overtime THEN 1
          ELSE 0
        END)::int as pts
      FROM season_teams t
      CROSS JOIN LATERAL (
        SELECT * FROM games g2
        WHERE g2.season_id = ${SEASON_ID} AND g2.status = 'final' AND NOT g2.is_playoff
          AND (g2.home_team = t.team_slug OR g2.away_team = t.team_slug)
      ) g
      WHERE t.season_id = ${SEASON_ID}
      GROUP BY t.team_slug
      ORDER BY pts DESC
    `,
    () => rawSql(sql`
      SELECT t.team_slug,
        SUM(CASE
          WHEN g.home_team = t.team_slug AND g.home_score > g.away_score AND NOT g.is_overtime THEN 3
          WHEN g.away_team = t.team_slug AND g.away_score > g.home_score AND NOT g.is_overtime THEN 3
          WHEN g.home_team = t.team_slug AND g.home_score > g.away_score AND g.is_overtime THEN 2
          WHEN g.away_team = t.team_slug AND g.away_score > g.home_score AND g.is_overtime THEN 2
          WHEN g.home_team = t.team_slug AND g.home_score < g.away_score AND g.is_overtime THEN 1
          WHEN g.away_team = t.team_slug AND g.away_score < g.home_score AND g.is_overtime THEN 1
          ELSE 0
        END)::int as pts
      FROM season_teams t
      CROSS JOIN LATERAL (
        SELECT * FROM games g2
        WHERE g2.season_id = ${SEASON_ID} AND g2.status = 'final' AND NOT g2.is_playoff
          AND (g2.home_team = t.team_slug OR g2.away_team = t.team_slug)
      ) g
      WHERE t.season_id = ${SEASON_ID}
      GROUP BY t.team_slug
      ORDER BY pts DESC
    `),
  ))

  // 6. Goalie stats with COUNT FILTER
  results.push(await bench(
    "Goalie stats (COUNT FILTER)",
    () => rawNeon`
      SELECT p.id, p.name,
        COUNT(DISTINCT ggs.game_id)::int as gp,
        SUM(ggs.saves)::int as saves,
        SUM(ggs.shots_against)::int as sa,
        SUM(ggs.shutouts)::int as shutouts,
        COUNT(*) FILTER (WHERE ggs.result = 'W')::int as wins,
        COUNT(*) FILTER (WHERE ggs.result = 'L')::int as losses
      FROM players p
      JOIN goalie_game_stats ggs ON p.id = ggs.player_id
      JOIN games g ON ggs.game_id = g.id AND g.season_id = ${SEASON_ID} AND NOT g.is_playoff
      GROUP BY p.id, p.name
      ORDER BY saves DESC
    `,
    () => rawSql(sql`
      SELECT p.id, p.name,
        COUNT(DISTINCT ggs.game_id)::int as gp,
        SUM(ggs.saves)::int as saves,
        SUM(ggs.shots_against)::int as sa,
        SUM(ggs.shutouts)::int as shutouts,
        COUNT(*) FILTER (WHERE ggs.result = 'W')::int as wins,
        COUNT(*) FILTER (WHERE ggs.result = 'L')::int as losses
      FROM players p
      JOIN goalie_game_stats ggs ON p.id = ggs.player_id
      JOIN games g ON ggs.game_id = g.id AND g.season_id = ${SEASON_ID} AND NOT g.is_playoff
      GROUP BY p.id, p.name
      ORDER BY saves DESC
    `),
  ))

  // Print results
  console.log("\n" + "=".repeat(78))
  console.log("BENCHMARK: raw neon vs Drizzle rawSql")
  console.log(`${ITERATIONS} iterations per query, ${WARMUP} warmup rounds`)
  console.log("=".repeat(78))
  console.log("")
  console.log(
    "Query".padEnd(38) +
    "neon (med)".padStart(10) +
    "drizzle (med)".padStart(14) +
    "diff".padStart(8) +
    "  overhead".padStart(10)
  )
  console.log("-".repeat(78))

  for (const r of results) {
    const nMed = median(r.neonMs)
    const dMed = median(r.drizzleMs)
    const diff = dMed - nMed
    const pct = nMed > 0 ? ((diff / nMed) * 100).toFixed(1) : "N/A"
    console.log(
      r.name.padEnd(38) +
      `${nMed.toFixed(0)}ms`.padStart(10) +
      `${dMed.toFixed(0)}ms`.padStart(14) +
      `${diff > 0 ? "+" : ""}${diff.toFixed(0)}ms`.padStart(8) +
      `${diff > 0 ? "+" : ""}${pct}%`.padStart(10)
    )
  }

  console.log("-".repeat(78))
  const allNeon = results.flatMap(r => r.neonMs)
  const allDrizzle = results.flatMap(r => r.drizzleMs)
  console.log(
    "TOTAL (avg across all)".padEnd(38) +
    `${avg(allNeon).toFixed(0)}ms`.padStart(10) +
    `${avg(allDrizzle).toFixed(0)}ms`.padStart(14)
  )
  console.log("")
}

main().catch(console.error)
