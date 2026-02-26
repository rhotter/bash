import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { createInitialState } from "@/lib/scorekeeper-types"

function validatePin(request: Request): boolean {
  const pin = request.headers.get("x-pin")
  return !!pin && pin === process.env.SCOREKEEPER_PIN
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validatePin(request)) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verify game exists and is upcoming
    const gameRows = await sql`
      SELECT id, status FROM games WHERE id = ${id}
    `
    if (gameRows.length === 0) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }
    if (gameRows[0].status === "final") {
      return NextResponse.json({ error: "Game is already final" }, { status: 400 })
    }

    const initialState = createInitialState()
    const pinHash = process.env.SCOREKEEPER_PIN!

    // Upsert game_live row
    await sql`
      INSERT INTO game_live (game_id, state, pin_hash)
      VALUES (${id}, ${JSON.stringify(initialState)}, ${pinHash})
      ON CONFLICT (game_id) DO UPDATE SET
        state = ${JSON.stringify(initialState)},
        updated_at = NOW()
    `

    // Set game status to live
    await sql`
      UPDATE games SET status = 'live', home_score = 0, away_score = 0 WHERE id = ${id}
    `

    return NextResponse.json({ ok: true, state: initialState })
  } catch (error) {
    console.error("Failed to start live game:", error)
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 })
  }
}
