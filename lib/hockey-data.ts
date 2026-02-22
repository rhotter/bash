import useSWR from "swr"
import type { BashApiData, BashGame, Standing } from "@/app/api/bash/route"
import type { PlayerStatsData, SkaterStat, GoalieStat } from "@/app/api/bash/players/route"
import type { RefStatsData, RefStat } from "@/app/api/bash/refs/route"
import type { BashGameDetail } from "@/app/api/bash/game/[id]/route"

export type { BashApiData, BashGame, Standing, PlayerStatsData, SkaterStat, GoalieStat, RefStatsData, RefStat, BashGameDetail }

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Fire-and-forget sync trigger — at most once per page load
let syncTriggered = false
function triggerSync() {
  if (syncTriggered) return
  syncTriggered = true
  fetch("/api/bash/sync").catch(() => {})
}

export function useBashData() {
  const { data, error, isLoading, mutate } = useSWR<BashApiData>("/api/bash", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
    onSuccess: () => triggerSync(),
  })

  return {
    games: data?.games ?? [],
    standings: data?.standings ?? [],
    lastUpdated: data?.lastUpdated ?? null,
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

export function usePlayerStats() {
  const { data, error, isLoading } = useSWR<PlayerStatsData>("/api/bash/players", fetcher, {
    refreshInterval: 120_000,
    revalidateOnFocus: true,
    dedupingInterval: 60_000,
  })

  return {
    skaters: data?.skaters ?? [],
    goalies: data?.goalies ?? [],
    teams: data?.teams ?? [],
    lastUpdated: data?.lastUpdated ?? null,
    isLoading,
    isError: !!error,
  }
}

export function useRefStats() {
  const { data, error, isLoading } = useSWR<RefStatsData>("/api/bash/refs", fetcher, {
    refreshInterval: 120_000,
    revalidateOnFocus: true,
    dedupingInterval: 60_000,
  })

  return {
    refs: data?.refs ?? [],
    lastUpdated: data?.lastUpdated ?? null,
    isLoading,
    isError: !!error,
  }
}

export function useGameDetail(gameId: string | null) {
  const { data, error, isLoading } = useSWR<BashGameDetail>(
    gameId ? `/api/bash/game/${gameId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )

  return {
    detail: data ?? null,
    isLoading,
    isError: !!error,
  }
}

// Get unique dates from games (for grouping)
export function getGameDates(games: BashGame[]): string[] {
  return [...new Set(games.map((g) => g.date))].sort().reverse()
}
