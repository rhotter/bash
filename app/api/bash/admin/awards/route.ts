import { NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"
import { canonicalizePlayerName } from "@/lib/player-name"

export async function GET(request: Request) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const seasonId = searchParams.get("seasonId")

  let query = db.select().from(schema.playerAwards)
  if (seasonId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.where(eq(schema.playerAwards.seasonId, seasonId)) as any
  }

  const awards = await query
  return NextResponse.json({ awards })
}

export async function POST(request: Request) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await request.json()
    const { playerName, playerId, seasonId, awardType } = data
    const parsedPlayerId =
      typeof playerId === "number"
        ? playerId
        : typeof playerId === "string" && playerId.trim()
          ? parseInt(playerId, 10)
          : null
    const seasonIdValue = typeof seasonId === "string" ? seasonId.trim() : ""
    const awardTypeValue = typeof awardType === "string" ? awardType.trim() : ""
    let resolvedPlayerId: number | null = null
    let resolvedPlayerName = typeof playerName === "string" ? canonicalizePlayerName(playerName) : ""

    if (parsedPlayerId && !Number.isNaN(parsedPlayerId)) {
      const [player] = await db
        .select({ id: schema.players.id, name: schema.players.name })
        .from(schema.players)
        .where(eq(schema.players.id, parsedPlayerId))
        .limit(1)

      if (!player) {
        return NextResponse.json({ error: "Selected player could not be found" }, { status: 400 })
      }

      resolvedPlayerId = player.id
      resolvedPlayerName = player.name
    }

    if (!resolvedPlayerName || !seasonIdValue || !awardTypeValue) {
      return NextResponse.json({ error: "playerName, seasonId, and awardType are required" }, { status: 400 })
    }

    const [award] = await db
      .insert(schema.playerAwards)
      .values({ 
        playerName: resolvedPlayerName,
        playerId: resolvedPlayerId,
        seasonId: seasonIdValue,
        awardType: awardTypeValue,
      })
      .returning()

    return NextResponse.json({ award })
  } catch (error) {
    console.error("Failed to create award:", error)
    return NextResponse.json({ error: "Internal Server Error. Award may already exist for this season." }, { status: 500 })
  }
}
