"use client"

import { getGameDates, type BashGame } from "@/lib/hockey-data"
import { formatGameDate } from "@/lib/format-time"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function ScoresTab({ games, isLoading }: { games: BashGame[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-card/30" />
        ))}
      </div>
    )
  }

  // Filter out playoff placeholder games (where home == away == landsharks placeholder)
  const realGames = games.filter((g) => !g.isPlayoff || (g.homeSlug !== g.awaySlug))

  const dates = getGameDates(realGames)

  // Group games by date
  const grouped = realGames.reduce<Record<string, BashGame[]>>((acc, game) => {
    if (!acc[game.date]) acc[game.date] = []
    acc[game.date].push(game)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6">
      {dates.map((date) => {
        const dateGames = grouped[date]
        if (!dateGames) return null
        return (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground whitespace-nowrap">
                {formatGameDate(date)}
              </h3>
              <div className="h-px flex-1 bg-border/60" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {dateGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </div>
        )
      })}

      {dates.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="text-xs text-muted-foreground">No games found.</p>
        </div>
      )}
    </div>
  )
}

function GameCard({ game }: { game: BashGame }) {
  const isFinal = game.status === "final"

  const content = (
    <div
      className={cn(
        "rounded-xl border border-border/40 bg-card/40 px-4 py-3 transition-all",
        isFinal && "hover:bg-card/70 hover:border-border/60 active:scale-[0.99]"
      )}
    >
      {/* Meta row */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[10px] text-muted-foreground/60 font-medium">
          {game.time} &middot; {game.location}
        </span>
        <StatusBadge game={game} />
      </div>

      {/* Teams */}
      <div className="flex flex-col gap-1.5">
        <TeamRow
          name={game.awayTeam}
          score={game.awayScore}
          isWinner={isFinal && game.awayScore !== null && game.homeScore !== null && game.awayScore > game.homeScore}
        />
        <TeamRow
          name={game.homeTeam}
          score={game.homeScore}
          isWinner={isFinal && game.homeScore !== null && game.awayScore !== null && game.homeScore > game.awayScore}
        />
      </div>
    </div>
  )

  if (isFinal) {
    return (
      <Link href={`/game/${game.id}`} className="group">
        {content}
      </Link>
    )
  }

  return content
}

function StatusBadge({ game }: { game: BashGame }) {
  if (game.status === "final") {
    return (
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
        {game.isOvertime ? "Final/OT" : "Final"}
      </span>
    )
  }
  return (
    <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/40">
      Upcoming
    </span>
  )
}

function TeamRow({
  name,
  score,
  isWinner,
}: {
  name: string
  score: number | null
  isWinner: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn(
        "flex-1 text-[13px]",
        isWinner ? "font-bold text-foreground" : "font-medium text-muted-foreground"
      )}>
        {name}
      </span>
      <span
        className={cn(
          "font-mono text-base tabular-nums min-w-[2ch] text-right font-bold",
          isWinner && "text-foreground",
          !isWinner && score !== null && "text-muted-foreground/60 font-medium",
          score === null && "text-muted-foreground/30 text-sm font-normal"
        )}
      >
        {score !== null ? score : "-"}
      </span>
    </div>
  )
}
