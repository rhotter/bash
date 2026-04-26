import { NextRequest, NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { getSession } from "@/lib/admin-session"
import * as xlsx from "xlsx"
import { inArray, eq, and } from "drizzle-orm"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = xlsx.read(buffer, { type: "buffer" })
    
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    // Read raw data
    const rawData = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet)

    // Fetch all existing team slugs to validate team assignments
    const allTeams = await db.select({ slug: schema.teams.slug }).from(schema.teams)
    const validTeamSlugs = new Set(allTeams.map((t) => t.slug))

    // 1. Data Mapping
    const mappedPlayers = rawData.map((row) => {
      // Name
      const firstName = row["FirstName"]?.toString().trim() || ""
      const lastName = row["LastName"]?.toString().trim() || ""
      const playerName = `${firstName} ${lastName}`.trim()

      // Team
      const rawTeam = row["Team"]?.toString().trim() || ""
      let teamSlug = rawTeam.toLowerCase().replace(/\s+/g, '-')
      if (!validTeamSlugs.has(teamSlug)) {
        teamSlug = "tbd"
      }

      // Position
      const positionStr = (row["ExpPos"] || row["Position"] || "").toString().toLowerCase()
      const isGoalie = positionStr.includes("goalie")

      // Rookie (trust sportability)
      const rookieStr = (row["Rookie"] || "0").toString()
      const isRookie = rookieStr === "1" || rookieStr.toLowerCase() === "true" || rookieStr.toLowerCase() === "yes"

      return {
        playerName,
        teamSlug,
        isGoalie,
        isRookie
      }
    }).filter(p => p.playerName.length > 0) // filter out empty rows

    if (mappedPlayers.length === 0) {
      console.log("DEBUG: No mapped players found. Raw Data sample (first 2 rows):", rawData.slice(0, 2))
      if (rawData.length > 0) {
        console.log("DEBUG: Available column headers in the first row:", Object.keys(rawData[0]))
      }
      return NextResponse.json({ error: "Unable to find valid player names. If Sportability has changed their export format, please reach out to the Bash devs." }, { status: 400 })
    }

    // 2. Database Comparison (Stats)
    const { id: seasonId } = await context.params
    const playerNames = mappedPlayers.map((p) => p.playerName)
    let existingPlayers: { id: number, name: string }[] = []
    
    if (playerNames.length > 0) {
      existingPlayers = await db
        .select({ id: schema.players.id, name: schema.players.name })
        .from(schema.players)
        .where(inArray(schema.players.name, playerNames))
    }

    const existingNamesSet = new Set(existingPlayers.map((p) => p.name))
    const existingPlayerIds = existingPlayers.map(p => p.id)

    // Check season roster
    let existingSeasonAssignments: { playerId: number }[] = []
    if (existingPlayerIds.length > 0) {
      existingSeasonAssignments = await db
        .select({ playerId: schema.playerSeasons.playerId })
        .from(schema.playerSeasons)
        .where(
          and(
            eq(schema.playerSeasons.seasonId, seasonId),
            inArray(schema.playerSeasons.playerId, existingPlayerIds)
          )
        )
    }
    const seasonAssignedIdsSet = new Set(existingSeasonAssignments.map(a => a.playerId))
    
    const totalInImport = mappedPlayers.length
    
    // Global stats
    const globalExisting = mappedPlayers.filter(p => existingNamesSet.has(p.playerName)).length
    const globalNew = totalInImport - globalExisting

    // Season stats
    let seasonExisting = 0
    mappedPlayers.forEach(p => {
      const dbPlayer = existingPlayers.find(ep => ep.name === p.playerName)
      if (dbPlayer && seasonAssignedIdsSet.has(dbPlayer.id)) {
        seasonExisting++
      }
    })
    const seasonNew = totalInImport - seasonExisting

    return NextResponse.json({
      stats: {
        totalInImport,
        globalExisting,
        globalNew,
        seasonExisting,
        seasonNew
      },
      mappedPlayers
    })

  } catch (error: unknown) {
    console.error("Failed to parse Sportability file:", error)
    return NextResponse.json({ error: "Failed to process file. Ensure it is a valid Sportability .xlsx export." }, { status: 500 })
  }
}
