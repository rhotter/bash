import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export interface RefStat {
  name: string
  games: number
  totalPen: number
  totalPim: number
  avgPimPerGame: number
}

export interface RefStatsData {
  refs: RefStat[]
  lastUpdated: string
}

export async function GET() {
  try {
    // Get all refs and their game counts
    const refRows = await sql`
      SELECT
        go.name,
        COUNT(DISTINCT go.game_id)::int as games
      FROM game_officials go
      WHERE go.role = 'ref'
      GROUP BY go.name
      ORDER BY games DESC, go.name ASC
    `

    // Get penalty totals per game (to attribute to refs)
    const penaltyRows = await sql`
      SELECT
        go.name as ref_name,
        SUM(pgs.pen)::int as total_pen,
        SUM(pgs.pim)::int as total_pim
      FROM game_officials go
      JOIN player_game_stats pgs ON go.game_id = pgs.game_id
      WHERE go.role = 'ref'
      GROUP BY go.name
    `

    const penMap = new Map<string, { totalPen: number; totalPim: number }>()
    for (const r of penaltyRows) {
      penMap.set(r.ref_name, { totalPen: r.total_pen, totalPim: r.total_pim })
    }

    const refs: RefStat[] = refRows.map((r) => {
      const pen = penMap.get(r.name) ?? { totalPen: 0, totalPim: 0 }
      return {
        name: r.name,
        games: r.games,
        totalPen: pen.totalPen,
        totalPim: pen.totalPim,
        avgPimPerGame: r.games > 0 ? Math.round((pen.totalPim / r.games) * 10) / 10 : 0,
      }
    })

    const result: RefStatsData = { refs, lastUpdated: new Date().toISOString() }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    })
  } catch (error) {
    console.error("Failed to fetch ref stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch ref stats", refs: [], lastUpdated: new Date().toISOString() },
      { status: 500 },
    )
  }
}
