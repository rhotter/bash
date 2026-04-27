import { NextRequest, NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"
import { revalidateTag } from "next/cache"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: seasonId } = await context.params

  try {
    const body = await request.json()
    const { games, playoffTeams } = body

    if (!games || !Array.isArray(games)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Overwrite any existing playoff games for the season
    // We only delete non-final playoff games to be safe, but typically this is used once
    await db.delete(schema.games).where(and(
      eq(schema.games.seasonId, seasonId),
      eq(schema.games.gameType, "playoff"),
      eq(schema.games.status, "upcoming")
    ))

    // Insert new playoff games
    if (games.length > 0) {
      const insertData = games.map((g: Record<string, unknown>) => ({
        ...g,
        seasonId,
        gameType: "playoff",
        isPlayoff: true,
      }))

      await db.insert(schema.games).values(insertData)
    }

    if (typeof playoffTeams === "number") {
      await db.update(schema.seasons)
        .set({ playoffTeams })
        .where(eq(schema.seasons.id, seasonId))
    }

    // @ts-expect-error - Next.js canary changed the signature of revalidateTag
    revalidateTag("seasons")
    return NextResponse.json({ success: true, count: games.length })
  } catch (error) {
    console.error("Failed to generate playoffs:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
