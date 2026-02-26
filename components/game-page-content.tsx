"use client"

import { GameDetail } from "@/components/game-detail"
import type { BashGameDetail } from "@/lib/hockey-data"
import type { BashGame } from "@/lib/hockey-data"

export function GamePageContent({ initialDetail }: { initialDetail: BashGameDetail }) {
  const game: BashGame = {
    id: initialDetail.id,
    date: initialDetail.date,
    time: initialDetail.time,
    homeTeam: initialDetail.homeTeam,
    homeSlug: initialDetail.homeSlug,
    awayTeam: initialDetail.awayTeam,
    awaySlug: initialDetail.awaySlug,
    homeScore: initialDetail.homeScore,
    awayScore: initialDetail.awayScore,
    status: initialDetail.status as "final" | "upcoming" | "live",
    isOvertime: initialDetail.isOvertime,
    isPlayoff: false,
    location: initialDetail.location,
    hasBoxscore: initialDetail.homePlayers.length > 0 || initialDetail.awayPlayers.length > 0,
  }

  return <GameDetail game={game} initialDetail={initialDetail} />
}
