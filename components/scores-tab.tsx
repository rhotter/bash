"use client"

import { useState, useMemo, useEffect } from "react"
import { getGameDates, type BashGame } from "@/lib/hockey-data"
import { formatGameDate } from "@/lib/format-time"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown, Loader2, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAdmin } from "@/lib/admin-context"
import { TeamLogo } from "@/components/team-logo"
import { periodLabel, formatClock } from "@/lib/scorekeeper-types"

function getWeekKey(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toISOString().slice(0, 10)
}

type DateGroup = { date: string; games: BashGame[] }

export function ScoresTab({ games, isLoading }: { games: BashGame[]; isLoading: boolean }) {
  const [showEarlier, setShowEarlier] = useState(false)
  const [showFuture, setShowFuture] = useState(false)

  const { earlierResults, recentResults, upcomingGames, futureSchedule } = useMemo(() => {
    const realGames = games.filter((g) => !g.isPlayoff || g.homeSlug !== g.awaySlug)
    const dates = getGameDates(realGames)

    const grouped = realGames.reduce<Record<string, BashGame[]>>((acc, game) => {
      if (!acc[game.date]) acc[game.date] = []
      acc[game.date].push(game)
      return acc
    }, {})

    // Dates up to and including today go under "Latest"
    // Dates after today go under "Upcoming"
    const today = new Date().toISOString().slice(0, 10)
    const completedDates = dates.filter(d => d <= today)
    const upcomingDates = dates.filter(d => d > today)

    // For completed: find the most recent week with games
    const completedWeeks = [...new Set(completedDates.map(getWeekKey))].sort().reverse()
    const recentWeek = completedWeeks[0] || null

    // For upcoming: find the nearest upcoming week
    // upcomingDates are sorted descending (from getGameDates), reverse for ascending
    const upcomingWeeks = [...new Set(upcomingDates.map(getWeekKey))].sort()
    const nextWeek = upcomingWeeks[0] || null

    const recentResultsDates: DateGroup[] = []
    const earlierResultsDates: DateGroup[] = []
    const upcomingGamesDates: DateGroup[] = []
    const futureScheduleDates: DateGroup[] = []

    for (const date of completedDates) {
      const wk = getWeekKey(date)
      const entry = { date, games: grouped[date] }
      if (wk === recentWeek) {
        recentResultsDates.push(entry)
      } else {
        earlierResultsDates.push(entry)
      }
    }

    // Upcoming dates are in descending order from getGameDates, reverse for chronological
    const upcomingChron = [...upcomingDates].reverse()
    for (const date of upcomingChron) {
      const wk = getWeekKey(date)
      const entry = { date, games: grouped[date] }
      if (wk === nextWeek) {
        upcomingGamesDates.push(entry)
      } else {
        futureScheduleDates.push(entry)
      }
    }

    return {
      earlierResults: earlierResultsDates,
      recentResults: recentResultsDates,
      upcomingGames: upcomingGamesDates,
      futureSchedule: futureScheduleDates,
    }
  }, [games])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasContent = recentResults.length > 0 || upcomingGames.length > 0 || earlierResults.length > 0 || futureSchedule.length > 0

  if (!hasContent) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-xs text-muted-foreground">No games found.</p>
      </div>
    )
  }

  const earlierGameCount = earlierResults.reduce((n, d) => n + d.games.length, 0)
  const futureGameCount = futureSchedule.reduce((n, d) => n + d.games.length, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Earlier results (hidden by default) */}
      {earlierGameCount > 0 && (
        <>
          {showEarlier && (
            earlierResults.map(({ date, games: dateGames }) => (
              <DateSection key={date} date={date} games={dateGames} />
            ))
          )}
          <button
            onClick={() => setShowEarlier(!showEarlier)}
            className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {showEarlier ? (
              <><ChevronUp className="h-3 w-3" />Hide earlier results</>
            ) : (
              <><ChevronDown className="h-3 w-3" />{earlierGameCount} earlier results</>
            )}
          </button>
        </>
      )}

      {/* This week (always shown) */}
      {recentResults.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 whitespace-nowrap">
              Latest
            </h2>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          {recentResults.map(({ date, games: dateGames }) => (
            <DateSection key={date} date={date} games={dateGames} />
          ))}
        </div>
      )}

      {/* Upcoming games (always shown) */}
      {upcomingGames.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 whitespace-nowrap">
              Upcoming
            </h2>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          {upcomingGames.map(({ date, games: dateGames }) => (
            <DateSection key={date} date={date} games={dateGames} />
          ))}
        </div>
      )}

      {/* Future schedule (hidden by default) */}
      {futureGameCount > 0 && (
        <>
          <button
            onClick={() => setShowFuture(!showFuture)}
            className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {showFuture ? (
              <><ChevronUp className="h-3 w-3" />Hide future schedule</>
            ) : (
              <><ChevronDown className="h-3 w-3" />{futureGameCount} more scheduled</>
            )}
          </button>
          {showFuture && (
            futureSchedule.map(({ date, games: dateGames }) => (
              <DateSection key={date} date={date} games={dateGames} />
            ))
          )}
        </>
      )}
    </div>
  )
}

function DateSection({ date, games }: { date: string; games: BashGame[] }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {formatGameDate(date)}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  )
}

function useLiveClock(game: BashGame) {
  const isLive = game.status === "live"
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!isLive || !game.liveClockRunning) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isLive, game.liveClockRunning])

  if (!isLive || game.livePeriod == null || game.liveClockSeconds == null) return null

  let seconds = game.liveClockSeconds
  if (game.liveClockRunning && game.liveClockStartedAt) {
    seconds = Math.max(0, seconds - (now - game.liveClockStartedAt) / 1000)
  }

  return { period: game.livePeriod, clock: formatClock(seconds) }
}

function GameCard({ game }: { game: BashGame }) {
  const router = useRouter()
  const { isAdmin } = useAdmin()
  const isFinal = game.status === "final"
  const isLive = game.status === "live"
  const awayWon = isFinal && game.awayScore != null && game.homeScore != null && game.awayScore > game.homeScore
  const homeWon = isFinal && game.homeScore != null && game.awayScore != null && game.homeScore > game.awayScore
  const liveClock = useLiveClock(game)

  const showAdminEdit = isAdmin && isFinal && game.hasLiveStats

  return (
    <div
      className={cn(
        "rounded-lg border border-border/40 bg-card select-none overflow-hidden",
        showAdminEdit && "border-amber-500/30"
      )}
    >
      {/* Card body — clickable to game page */}
      <div
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => router.push(`/game/${game.id}`)}
      >
        {/* Status bar */}
        <div className="px-3 pt-2 pb-1 border-b border-border/20 flex items-center justify-between">
          {isLive && liveClock ? (
            <span className="text-[10px] tabular-nums font-mono text-muted-foreground/70">
              {periodLabel(liveClock.period)} {liveClock.clock}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50">{game.time}</span>
          )}
          {isLive ? (
            <span className="inline-flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              <span className="text-[9px] text-red-500 font-bold uppercase">Live</span>
            </span>
          ) : isFinal ? (
            <span className="text-[9px] text-muted-foreground/50 font-medium uppercase">Final{game.isOvertime ? "/OT" : ""}</span>
          ) : null}
        </div>

        {/* Teams and scores */}
        <div className="px-3 py-2 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <TeamLogo slug={game.awaySlug} name={game.awayTeam} size={24} className="shrink-0" />
              <span className={cn(
                "text-xs truncate",
                awayWon ? "font-semibold" : "text-muted-foreground",
              )}>
                {game.awayTeam}
              </span>
            </div>
            <span className={cn(
              "text-sm tabular-nums font-mono w-6 text-right shrink-0",
              awayWon ? "font-bold" : isLive ? "font-bold" : "text-muted-foreground"
            )}>
              {game.awayScore ?? "-"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <TeamLogo slug={game.homeSlug} name={game.homeTeam} size={24} className="shrink-0" />
              <span className={cn(
                "text-xs truncate",
                homeWon ? "font-semibold" : "text-muted-foreground",
              )}>
                {game.homeTeam}
              </span>
            </div>
            <span className={cn(
              "text-sm tabular-nums font-mono w-6 text-right shrink-0",
              homeWon ? "font-bold" : isLive ? "font-bold" : "text-muted-foreground"
            )}>
              {game.homeScore ?? "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Admin edit bar — separate hover zone */}
      {showAdminEdit && (
        <button
          className="w-full border-t border-amber-500/20 bg-amber-500/10 px-3 py-1.5 flex items-center justify-center gap-1.5 hover:bg-amber-500/25 transition-colors cursor-pointer"
          onClick={() => router.push(`/game/${game.id}?edit=1`)}
        >
          <Pencil className="h-3 w-3 text-amber-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Edit</span>
        </button>
      )}
    </div>
  )
}
