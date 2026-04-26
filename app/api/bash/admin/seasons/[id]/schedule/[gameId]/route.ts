import { NextRequest, NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"
import { revalidateTag } from "next/cache"

interface RouteContext {
  params: Promise<{ id: string; gameId: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: seasonId, gameId } = await context.params

  try {
    const body = await request.json()
    
    // Map gameType to isPlayoff correctly if provided
    let isPlayoff = undefined;
    if (body.gameType !== undefined) {
      isPlayoff = body.gameType === "playoff" || body.gameType === "championship"
    }

    const updateData = {
      ...body,
      ...(isPlayoff !== undefined ? { isPlayoff } : {})
    }

    // Clean up empty strings to nulls for certain fields
    if (updateData.notes === "") updateData.notes = null
    if (updateData.homeNotes === "") updateData.homeNotes = null
    if (updateData.awayNotes === "") updateData.awayNotes = null

    // 1. Update the target game
    await db.update(schema.games)
      .set(updateData)
      .where(and(
        eq(schema.games.id, gameId),
        eq(schema.games.seasonId, seasonId)
      ))

    // 2. Series-aware auto-advancement logic
    // If the game is a playoff game, it is now "final", and has a seriesId, we need to check if the series is clinched.
    if (body.status === "final") {
      const [game] = await db.select().from(schema.games).where(eq(schema.games.id, gameId)).limit(1)
      
      if (game && game.gameType === "playoff" && game.seriesId && game.nextGameId && game.nextGameSlot) {
        // Fetch all games in this series
        const seriesGames = await db.select()
          .from(schema.games)
          .where(and(
            eq(schema.games.seasonId, seasonId),
            eq(schema.games.seriesId, game.seriesId)
          ))

        // Count wins per team in the series
        const winCounts: Record<string, number> = {}
        const seriesLength = seriesGames.length
        const winsNeededToClinch = Math.ceil(seriesLength / 2)

        for (const sg of seriesGames) {
          if (sg.status === "final" && !sg.isForfeit) {
            // Determine winner of this game
            const homeScore = sg.homeScore || 0
            const awayScore = sg.awayScore || 0
            
            let winnerSlug: string | null = null
            if (homeScore > awayScore) {
              winnerSlug = sg.homeTeam
            } else if (awayScore > homeScore) {
              winnerSlug = sg.awayTeam
            }
            // Ignore ties (shouldn't happen in playoffs, but just in case)

            if (winnerSlug) {
              winCounts[winnerSlug] = (winCounts[winnerSlug] || 0) + 1
            }
          }
        }

        // Check if any team has reached the required wins
        let clinchedWinner: string | null = null
        for (const [teamSlug, wins] of Object.entries(winCounts)) {
          if (wins >= winsNeededToClinch) {
            clinchedWinner = teamSlug
            break
          }
        }

        // If someone clinched the series, advance them to the next game
        if (clinchedWinner) {
          const updateSlot = game.nextGameSlot === "home" ? { homeTeam: clinchedWinner } : { awayTeam: clinchedWinner }
          
          await db.update(schema.games)
            .set(updateSlot)
            .where(eq(schema.games.id, game.nextGameId))
        }
      }
    }

    // @ts-expect-error - Next.js canary changed the signature of revalidateTag
    revalidateTag("seasons")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update game:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: seasonId, gameId } = await context.params
  const url = new URL(request.url)
  const force = url.searchParams.get("force") === "true"

  try {
    const [game] = await db.select().from(schema.games).where(eq(schema.games.id, gameId)).limit(1)

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    // Protection for final games with boxscores
    if (game.status === "final" && game.hasBoxscore && !force) {
      return NextResponse.json(
        { error: "Cannot delete a final game with boxscore data unless forced" },
        { status: 400 }
      )
    }

    // Must delete child records first since no cascade is defined
    await db.delete(schema.playerGameStats).where(eq(schema.playerGameStats.gameId, gameId))
    await db.delete(schema.goalieGameStats).where(eq(schema.goalieGameStats.gameId, gameId))
    await db.delete(schema.gameOfficials).where(eq(schema.gameOfficials.gameId, gameId))
    await db.delete(schema.gameLive).where(eq(schema.gameLive.gameId, gameId))

    // Delete the game itself
    await db.delete(schema.games).where(and(
      eq(schema.games.id, gameId),
      eq(schema.games.seasonId, seasonId)
    ))

    // @ts-expect-error - Next.js canary changed the signature of revalidateTag
    revalidateTag("seasons")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete game:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
