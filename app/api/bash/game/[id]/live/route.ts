import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const rows = await sql`
      SELECT gl.state, gl.updated_at,
        g.home_score, g.away_score, g.status,
        g.home_team, g.away_team,
        ht.name as home_team_name, awt.name as away_team_name
      FROM game_live gl
      JOIN games g ON gl.game_id = g.id
      JOIN teams ht ON g.home_team = ht.slug
      JOIN teams awt ON g.away_team = awt.slug
      WHERE gl.game_id = ${id}
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "No live data" }, { status: 404 })
    }

    const row = rows[0]
    return NextResponse.json({
      state: row.state,
      homeScore: row.home_score,
      awayScore: row.away_score,
      status: row.status,
      homeSlug: row.home_team,
      awaySlug: row.away_team,
      homeTeam: row.home_team_name,
      awayTeam: row.away_team_name,
      updatedAt: row.updated_at,
    }, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
    })
  } catch (error) {
    console.error("Failed to fetch live game:", error)
    return NextResponse.json({ error: "Failed to fetch live data" }, { status: 500 })
  }
}
