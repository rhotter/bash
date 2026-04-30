import { NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { desc, eq } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"
import { canonicalizePlayerName } from "@/lib/player-name"

export async function GET() {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const _hof = await db.select().from(schema.hallOfFame).orderBy(desc(schema.hallOfFame.classYear))
  return NextResponse.json({ hallOfFame: _hof })
}

export async function POST(request: Request) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await request.json()
    const { playerName, playerId, classYear, wing, yearsActive, achievements } = data
    const parsedPlayerId =
      typeof playerId === "number"
        ? playerId
        : typeof playerId === "string" && playerId.trim()
          ? parseInt(playerId, 10)
          : null
    const classYearValue =
      typeof classYear === "number" ? classYear : parseInt(String(classYear ?? ""), 10)
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

    if (!resolvedPlayerName || Number.isNaN(classYearValue)) {
      return NextResponse.json({ error: "playerName and classYear are required" }, { status: 400 })
    }

    const [hofEntry] = await db
      .insert(schema.hallOfFame)
      .values({ 
        playerName: resolvedPlayerName,
        playerId: resolvedPlayerId,
        classYear: classYearValue,
        wing: wing?.trim() || "players",
        yearsActive: typeof yearsActive === "string" ? yearsActive.trim() || null : null,
        achievements: typeof achievements === "string" ? achievements.trim() || null : null,
      })
      .returning()

    return NextResponse.json({ entry: hofEntry })
  } catch (error) {
    console.error("Failed to create HOF entry:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
