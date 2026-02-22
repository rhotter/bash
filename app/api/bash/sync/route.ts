import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

const BASE_URL = "https://secure.sportability.com/spx/Leagues"
const LEAGUE_ID = "50562"
const SEASON_ID = "2025-2026"
const MAX_BOXSCORES_PER_SYNC = 3

// Parse HTML text content (strip tags)
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

// Fetch and parse schedule page to update scores
async function syncSchedule() {
  const url = `${BASE_URL}/Schedule.asp?LgID=${LEAGUE_ID}`
  const res = await fetch(url, { cache: "no-store" })
  const html = await res.text()

  // Parse game rows from schedule HTML
  // Look for patterns like: GID=XXXXXXX and score patterns
  const gamePattern = /GID=(\d+)/g
  const gameIds: string[] = []
  let match
  while ((match = gamePattern.exec(html)) !== null) {
    if (!gameIds.includes(match[1])) {
      gameIds.push(match[1])
    }
  }

  // Parse scores from the schedule page
  // The schedule shows: "Away # @ Home #" or "Away @ Home" for upcoming
  // We need to extract scores for each game
  // Strategy: find each game row by GID, then parse the surrounding content

  // For each game that exists in our DB, check if the score has changed
  const updates: { id: string; homeScore: number; awayScore: number; isOT: boolean }[] = []

  // Parse the HTML more carefully - look for table rows with game data
  // Sportability format: each game row has team names and scores
  const rows = html.split(/(?=GID=\d+)/)

  for (const row of rows) {
    const gidMatch = row.match(/GID=(\d+)/)
    if (!gidMatch) continue
    const gid = gidMatch[1]

    // Look for score pattern: "TeamA #" and "TeamB #" or "(OT)" marker
    // The format typically shows: "Away Team Score @ Home Team Score"
    // Or in the boxscore link area
    const scorePattern = /(\d+)\s*(?:@|vs\.?)\s*(?:.*?)(\d+)/
    const otPattern = /\(OT\)/i

    // Try to extract scores from the row text
    const text = stripHtml(row)
    const isOT = otPattern.test(text)

    // More targeted: look for the score numbers near the "@" symbol
    const atPattern = /(\d+)\s+@\s+.*?(\d+)/
    const atMatch = text.match(atPattern)

    if (atMatch) {
      const awayScore = parseInt(atMatch[1])
      const homeScore = parseInt(atMatch[2])
      if (!isNaN(awayScore) && !isNaN(homeScore)) {
        updates.push({ id: gid, homeScore, awayScore, isOT })
      }
    }
  }

  // Update games in DB
  let updated = 0
  for (const u of updates) {
    const result = await sql`
      UPDATE games
      SET home_score = ${u.homeScore}, away_score = ${u.awayScore},
          status = 'final', is_overtime = ${u.isOT}
      WHERE id = ${u.id} AND season_id = ${SEASON_ID}
        AND (home_score IS NULL OR home_score != ${u.homeScore} OR away_score != ${u.awayScore})
    `
    if (result.length !== undefined) updated++
  }

  return { gamesChecked: gameIds.length, updatesApplied: updated }
}

// Fetch and parse a game boxscore
async function syncBoxscore(gameId: string) {
  const url = `${BASE_URL}/Game.asp?LgID=${LEAGUE_ID}&GID=${gameId}`
  const res = await fetch(url, { cache: "no-store" })
  const html = await res.text()
  const text = stripHtml(html)

  // Get game info to know which teams are playing
  const gameRows = await sql`
    SELECT home_team, away_team FROM games WHERE id = ${gameId}
  `
  if (gameRows.length === 0) return

  const { home_team, away_team } = gameRows[0]

  // Parse player stats from boxscore
  // Sportability boxscore format has tables with: Player, G, A, Pts, Pen, PIM
  // And goalie stats: Player, Min, GA, SA, Sv, Result

  // Parse officials
  const refPattern = /(?:Referee|Official|Ref)[:\s]*([^\n<]+)/gi
  let refMatch
  const refs: string[] = []
  while ((refMatch = refPattern.exec(html)) !== null) {
    const refName = stripHtml(refMatch[1]).trim()
    if (refName && refName.length > 1 && refName.length < 50) {
      refs.push(refName)
    }
  }

  // Also look for "Scorekeeper" pattern
  const skPattern = /Scorekeeper[:\s]*([^\n<]+)/gi
  let skMatch
  const scorekeepers: string[] = []
  while ((skMatch = skPattern.exec(html)) !== null) {
    const skName = stripHtml(skMatch[1]).trim()
    if (skName && skName.length > 1 && skName.length < 50) {
      scorekeepers.push(skName)
    }
  }

  // Insert officials
  for (const ref of refs) {
    await sql`
      INSERT INTO game_officials (game_id, name, role)
      SELECT ${gameId}, ${ref}, 'ref'
      WHERE NOT EXISTS (
        SELECT 1 FROM game_officials WHERE game_id = ${gameId} AND name = ${ref}
      )
    `
  }
  for (const sk of scorekeepers) {
    await sql`
      INSERT INTO game_officials (game_id, name, role)
      SELECT ${gameId}, ${sk}, 'scorekeeper'
      WHERE NOT EXISTS (
        SELECT 1 FROM game_officials WHERE game_id = ${gameId} AND name = ${sk}
      )
    `
  }

  // Parse player stats tables
  // Sportability uses HTML tables - we need to find them
  // The boxscore typically has two sections: away team stats and home team stats
  // Each section has a skater table and possibly a goalie table

  // Extract tables using regex
  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi
  const tables: string[] = []
  let tableMatch
  while ((tableMatch = tablePattern.exec(html)) !== null) {
    tables.push(tableMatch[0])
  }

  // Process tables looking for player stats
  for (const table of tables) {
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    const trs: string[] = []
    let trMatch
    while ((trMatch = rowPattern.exec(table)) !== null) {
      trs.push(trMatch[1])
    }

    if (trs.length < 2) continue

    // Check header row to determine table type
    const headerText = stripHtml(trs[0]).toLowerCase()

    if (headerText.includes("player") && headerText.includes("pts")) {
      // This is a skater stats table
      // Determine which team based on position in HTML or team name in surrounding context
      const teamSlug = html.indexOf(table) < html.indexOf(table, html.indexOf(table) + 1) ? away_team : home_team

      for (let i = 1; i < trs.length; i++) {
        const cells = trs[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi)
        if (!cells || cells.length < 5) continue

        const playerName = stripHtml(cells[0])
        if (!playerName || playerName === "Totals" || playerName === "Total") continue

        const goals = parseInt(stripHtml(cells[1])) || 0
        const assists = parseInt(stripHtml(cells[2])) || 0
        const points = parseInt(stripHtml(cells[3])) || 0
        const pen = parseInt(stripHtml(cells[4])) || 0
        const pim = cells.length > 5 ? parseInt(stripHtml(cells[5])) || 0 : pen * 2

        // Upsert player
        const playerRows = await sql`
          INSERT INTO players (name) VALUES (${playerName})
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `
        const playerId = playerRows[0].id

        // Upsert player season
        await sql`
          INSERT INTO player_seasons (player_id, season_id, team_slug, is_goalie)
          VALUES (${playerId}, ${SEASON_ID}, ${teamSlug}, false)
          ON CONFLICT (player_id, season_id) DO NOTHING
        `

        // Upsert player game stats
        await sql`
          INSERT INTO player_game_stats (player_id, game_id, goals, assists, points, pen, pim)
          VALUES (${playerId}, ${gameId}, ${goals}, ${assists}, ${points}, ${pen}, ${pim})
          ON CONFLICT (player_id, game_id) DO UPDATE SET
            goals = EXCLUDED.goals, assists = EXCLUDED.assists,
            points = EXCLUDED.points, pen = EXCLUDED.pen, pim = EXCLUDED.pim
        `
      }
    }

    if (headerText.includes("goalie") || (headerText.includes("player") && headerText.includes("min") && headerText.includes("result"))) {
      // This is a goalie stats table
      const teamSlug = html.indexOf(table) < html.indexOf(table, html.indexOf(table) + 1) ? away_team : home_team

      for (let i = 1; i < trs.length; i++) {
        const cells = trs[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi)
        if (!cells || cells.length < 5) continue

        const playerName = stripHtml(cells[0])
        if (!playerName || playerName === "Totals" || playerName === "Total") continue

        const minutes = parseInt(stripHtml(cells[1])) || 0
        const ga = parseInt(stripHtml(cells[2])) || 0
        const sa = parseInt(stripHtml(cells[3])) || 0
        const saves = parseInt(stripHtml(cells[4])) || 0
        const result = cells.length > 5 ? stripHtml(cells[5]) : null

        // Upsert player
        const playerRows = await sql`
          INSERT INTO players (name) VALUES (${playerName})
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `
        const playerId = playerRows[0].id

        // Upsert player season as goalie
        await sql`
          INSERT INTO player_seasons (player_id, season_id, team_slug, is_goalie)
          VALUES (${playerId}, ${SEASON_ID}, ${teamSlug}, true)
          ON CONFLICT (player_id, season_id) DO UPDATE SET is_goalie = true
        `

        // Upsert goalie game stats
        await sql`
          INSERT INTO goalie_game_stats (player_id, game_id, minutes, goals_against, shots_against, saves, result)
          VALUES (${playerId}, ${gameId}, ${minutes}, ${ga}, ${sa}, ${saves}, ${result})
          ON CONFLICT (player_id, game_id) DO UPDATE SET
            minutes = EXCLUDED.minutes, goals_against = EXCLUDED.goals_against,
            shots_against = EXCLUDED.shots_against, saves = EXCLUDED.saves, result = EXCLUDED.result
        `
      }
    }
  }

  // Mark game as having boxscore
  await sql`UPDATE games SET has_boxscore = true WHERE id = ${gameId}`
}

export async function GET() {
  try {
    // Step 1: Sync schedule (scores)
    const scheduleResult = await syncSchedule()

    // Step 2: Sync boxscores for completed games without boxscore data
    const gamesNeedingBoxscore = await sql`
      SELECT id FROM games
      WHERE season_id = ${SEASON_ID}
        AND status = 'final'
        AND has_boxscore = false
      ORDER BY date ASC
      LIMIT ${MAX_BOXSCORES_PER_SYNC}
    `

    let boxscoresSynced = 0
    for (const game of gamesNeedingBoxscore) {
      try {
        await syncBoxscore(game.id)
        boxscoresSynced++
      } catch (err) {
        console.error(`Failed to sync boxscore for game ${game.id}:`, err)
      }
    }

    // Update sync metadata
    await sql`
      INSERT INTO sync_metadata (key, value)
      VALUES ('last_sync', ${new Date().toISOString()})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `

    return NextResponse.json({
      ok: true,
      schedule: scheduleResult,
      boxscoresSynced,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Sync failed:", error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
