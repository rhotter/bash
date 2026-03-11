import { NextResponse } from "next/server"
import { fetchLiveGameData } from "@/lib/fetch-live-game"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const data = await fetchLiveGameData(id)

    if (!data) {
      return NextResponse.json({ error: "No live data" }, { status: 404 })
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
    })
  } catch (error) {
    console.error("Failed to fetch live game:", error)
    return NextResponse.json({ error: "Failed to fetch live data" }, { status: 500 })
  }
}
