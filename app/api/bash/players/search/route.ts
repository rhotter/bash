import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentSeason } from "@/lib/seasons"
import { playerSlug } from "@/lib/player-slug"

export interface PlayerSearchResult {
  name: string
  slug: string
  team: string
  teamSlug: string
}

export async function GET() {
  try {
    const season = getCurrentSeason()
    const rows = await sql`
      SELECT DISTINCT p.name, t.name AS team, t.slug AS team_slug
      FROM players p
      JOIN player_seasons ps ON ps.player_id = p.id
      JOIN teams t ON t.slug = ps.team_slug
      WHERE ps.season_id = ${season.id}
      ORDER BY p.name
    `

    const players: PlayerSearchResult[] = rows.map((r) => ({
      name: r.name as string,
      slug: playerSlug(r.name as string),
      team: r.team as string,
      teamSlug: r.team_slug as string,
    }))

    return NextResponse.json({ players }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  } catch (error) {
    console.error("Failed to search players:", error)
    return NextResponse.json({ players: [] }, { status: 500 })
  }
}
