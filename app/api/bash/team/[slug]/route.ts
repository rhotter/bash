import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export interface TeamDetail {
  slug: string
  name: string
  roster: {
    id: number
    name: string
    isGoalie: boolean
    gp: number
    goals: number
    assists: number
    points: number
    pim: number
  }[]
  games: {
    id: string
    date: string
    time: string
    opponent: string
    opponentSlug: string
    isHome: boolean
    teamScore: number | null
    opponentScore: number | null
    status: string
    isOvertime: boolean
    result: "W" | "L" | "OTW" | "OTL" | null
  }[]
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    // Check team exists
    const teamRows = await sql`SELECT slug, name FROM teams WHERE slug = ${slug}`
    if (teamRows.length === 0) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }
    const team = teamRows[0]

    // Roster with aggregated stats
    const rosterRows = await sql`
      SELECT
        p.id, p.name, ps.is_goalie,
        COALESCE((SELECT COUNT(*) FROM player_game_stats pgs WHERE pgs.player_id = p.id)::int, 0) as gp,
        COALESCE((SELECT SUM(goals) FROM player_game_stats pgs WHERE pgs.player_id = p.id)::int, 0) as goals,
        COALESCE((SELECT SUM(assists) FROM player_game_stats pgs WHERE pgs.player_id = p.id)::int, 0) as assists,
        COALESCE((SELECT SUM(points) FROM player_game_stats pgs WHERE pgs.player_id = p.id)::int, 0) as points,
        COALESCE((SELECT SUM(pim) FROM player_game_stats pgs WHERE pgs.player_id = p.id)::int, 0) as pim
      FROM players p
      JOIN player_seasons ps ON p.id = ps.player_id AND ps.season_id = '2025-2026'
      WHERE ps.team_slug = ${slug}
      ORDER BY ps.is_goalie ASC, points DESC, goals DESC, p.name ASC
    `

    const roster = rosterRows.map((r) => ({
      id: r.id,
      name: r.name,
      isGoalie: r.is_goalie,
      gp: r.gp,
      goals: r.goals,
      assists: r.assists,
      points: r.points,
      pim: r.pim,
    }))

    // Team games
    const gameRows = await sql`
      SELECT
        g.id, g.date, g.time, g.home_score, g.away_score,
        g.status, g.is_overtime,
        g.home_team, g.away_team,
        ht.name as home_name, awt.name as away_name
      FROM games g
      JOIN teams ht ON g.home_team = ht.slug
      JOIN teams awt ON g.away_team = awt.slug
      WHERE g.season_id = '2025-2026'
        AND (g.home_team = ${slug} OR g.away_team = ${slug})
        AND g.is_playoff = false
      ORDER BY g.date DESC, g.time DESC
    `

    const games = gameRows.map((r) => {
      const isHome = r.home_team === slug
      const teamScore = isHome ? r.home_score : r.away_score
      const opponentScore = isHome ? r.away_score : r.home_score
      let result: "W" | "L" | "OTW" | "OTL" | null = null
      if (r.status === "final" && teamScore != null && opponentScore != null) {
        if (teamScore > opponentScore) {
          result = r.is_overtime ? "OTW" : "W"
        } else {
          result = r.is_overtime ? "OTL" : "L"
        }
      }
      return {
        id: r.id,
        date: r.date,
        time: r.time,
        opponent: isHome ? r.away_name : r.home_name,
        opponentSlug: isHome ? r.away_team : r.home_team,
        isHome,
        teamScore,
        opponentScore,
        status: r.status,
        isOvertime: r.is_overtime,
        result,
      }
    })

    const result: TeamDetail = { slug: team.slug, name: team.name, roster, games }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    })
  } catch (error) {
    console.error("Failed to fetch team detail:", error)
    return NextResponse.json({ error: "Failed to fetch team detail" }, { status: 500 })
  }
}
