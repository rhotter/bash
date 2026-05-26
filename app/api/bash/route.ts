import { NextResponse } from "next/server"
import { fetchBashData, type BashGame, type Standing, type BashApiData } from "@/lib/fetch-bash-data"

export type { BashGame, Standing, BashApiData }

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const seasonParam = searchParams.get("season")
    const result = await fetchBashData(seasonParam)

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    })
  } catch (error) {
    console.error("Failed to fetch BASH data:", error)
    return NextResponse.json(
      { error: "Failed to fetch data", games: [], standings: [], lastUpdated: new Date().toISOString() },
      { status: 500 },
    )
  }
}
