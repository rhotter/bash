import { NextResponse } from "next/server"
import {
  fetchTeamDetail,
  type TeamDetail,
  type TeamRecord,
  type SkaterRoster,
  type GoalieRoster,
} from "@/lib/fetch-team-detail"

export type { TeamDetail, TeamRecord, SkaterRoster, GoalieRoster }

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const seasonParam = searchParams.get("season")

  try {
    const result = await fetchTeamDetail(slug, seasonParam)
    if (!result) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    })
  } catch (error) {
    console.error("Failed to fetch team detail:", error)
    return NextResponse.json({ error: "Failed to fetch team detail" }, { status: 500 })
  }
}
