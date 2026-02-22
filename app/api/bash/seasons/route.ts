import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getAllSeasons, isCurrentSeason } from "@/lib/seasons"

export interface SeasonInfo {
  id: string
  name: string
  isCurrent: boolean
  hasGames: boolean
}

export interface SeasonsData {
  seasons: SeasonInfo[]
}

export async function GET() {
  try {
    // Check which seasons have games in the DB
    const dbSeasons = await sql`
      SELECT season_id, COUNT(*)::int as game_count
      FROM games
      GROUP BY season_id
    `
    const seasonGameCounts = new Map<string, number>()
    for (const row of dbSeasons) {
      seasonGameCounts.set(row.season_id, row.game_count)
    }

    const allSeasons = getAllSeasons() // newest first
    const seasons: SeasonInfo[] = allSeasons.map((s) => ({
      id: s.id,
      name: s.name,
      isCurrent: isCurrentSeason(s.id),
      hasGames: (seasonGameCounts.get(s.id) ?? 0) > 0,
    }))

    return NextResponse.json({ seasons } satisfies SeasonsData, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  } catch (error) {
    console.error("Failed to fetch seasons:", error)
    return NextResponse.json({ seasons: [] }, { status: 500 })
  }
}
