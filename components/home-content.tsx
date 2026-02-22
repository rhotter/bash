"use client"

import { useSearchParams } from "next/navigation"
import { ScoresTab } from "@/components/scores-tab"
import { useBashData, type BashApiData } from "@/lib/hockey-data"

export function HomeContent({ initialData }: { initialData?: BashApiData }) {
  const searchParams = useSearchParams()
  const season = searchParams.get("season") || undefined
  const { games, isLoading } = useBashData(season, initialData)

  return <ScoresTab games={games} isLoading={isLoading} />
}
