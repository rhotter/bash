import { NextResponse } from "next/server"
import {
  fetchGameDetail,
  type BashGameDetail,
  type PlayerBoxScore,
  type GoalieBoxScore,
} from "@/lib/fetch-game-detail"

export type { BashGameDetail, PlayerBoxScore, GoalieBoxScore }

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const result = await fetchGameDetail(id)
    if (!result) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    })
  } catch (error) {
    console.error("Failed to fetch game detail:", error)
    return NextResponse.json({ error: "Failed to fetch game detail" }, { status: 500 })
  }
}
