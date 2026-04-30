import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { sql } from "drizzle-orm"
import { rawSql } from "@/lib/db"
import { fetchGameDetail } from "@/lib/fetch-game-detail"
import { fetchLiveGameData } from "@/lib/fetch-live-game"
import { GamePageContent } from "@/components/game-page-content"
import type { RosterPlayer } from "@/lib/scorekeeper-types"

async function getRoster(teamSlug: string, seasonId: string): Promise<RosterPlayer[]> {
  const rows = await rawSql(sql`
    SELECT p.id, p.name
    FROM player_seasons ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.season_id = ${seasonId} AND ps.team_slug = ${teamSlug}
    ORDER BY p.name ASC
  `)
  return rows.map((r) => ({ id: r.id, name: r.name }))
}

export default async function AdminGameEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [detail, liveData] = await Promise.all([
    fetchGameDetail(id),
    fetchLiveGameData(id).catch(() => null),
  ])
  if (!detail) notFound()

  let homeRoster: RosterPlayer[] | undefined
  let awayRoster: RosterPlayer[] | undefined
  let seasonId: string | undefined

  if (liveData) {
    const gameRows = await rawSql(sql`SELECT season_id FROM games WHERE id = ${id}`)
    if (gameRows.length > 0) {
      seasonId = gameRows[0].season_id
      const [hr, ar] = await Promise.all([
        getRoster(detail.homeSlug, seasonId!),
        getRoster(detail.awaySlug, seasonId!),
      ])
      homeRoster = hr
      awayRoster = ar
    }
  } else {
    const gameRows = await rawSql(sql`SELECT season_id FROM games WHERE id = ${id}`)
    if (gameRows.length > 0) seasonId = gameRows[0].season_id
  }

  const backHref = seasonId ? `/admin/seasons/${seasonId}` : "/admin/seasons"

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to schedule
      </Link>
      <GamePageContent
        initialDetail={detail}
        initialLiveData={liveData}
        homeRoster={homeRoster}
        awayRoster={awayRoster}
        forceEdit
      />
    </div>
  )
}
