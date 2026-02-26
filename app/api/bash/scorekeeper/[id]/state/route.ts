import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import type { LiveGameState } from "@/lib/scorekeeper-types"

function validatePin(request: Request): boolean {
  const pin = request.headers.get("x-pin")
  if (pin && pin === process.env.SCOREKEEPER_PIN) return true
  // Fallback: check query params (for sendBeacon)
  const url = new URL(request.url)
  const qpin = url.searchParams.get("pin")
  return !!qpin && qpin === process.env.SCOREKEEPER_PIN
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validatePin(request)) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 })
  }

  const { id } = await params

  try {
    const state: LiveGameState = await request.json()

    // Compute current scores from goals (excluding shootout goals in period 5)
    let homeScore = 0
    let awayScore = 0
    const gameRows = await sql`
      SELECT home_team, away_team FROM games WHERE id = ${id}
    `
    if (gameRows.length === 0) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const homeSlug = gameRows[0].home_team
    const awaySlug = gameRows[0].away_team

    for (const goal of state.goals) {
      if (goal.period <= 4) {
        if (goal.team === homeSlug) homeScore++
        else if (goal.team === awaySlug) awayScore++
      }
    }

    // If shootout, add 1 to the winner
    if (state.shootout) {
      const homeSOGoals = state.shootout.homeAttempts.filter((a) => a.scored).length
      const awaySOGoals = state.shootout.awayAttempts.filter((a) => a.scored).length
      if (homeSOGoals > awaySOGoals) homeScore++
      else if (awaySOGoals > homeSOGoals) awayScore++
    }

    // Update game_live state and games scores
    await sql`
      UPDATE game_live SET state = ${JSON.stringify(state)}, updated_at = NOW()
      WHERE game_id = ${id}
    `

    await sql`
      UPDATE games SET home_score = ${homeScore}, away_score = ${awayScore}
      WHERE id = ${id}
    `

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to update live state:", error)
    return NextResponse.json({ error: "Failed to update state" }, { status: 500 })
  }
}

// POST handler for sendBeacon (which can only send POST)
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return PUT(request, ctx)
}
