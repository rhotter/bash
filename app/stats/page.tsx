import { Suspense } from "react"
import { SiteHeader } from "@/components/site-header"
import { StatsTab } from "@/components/stats-tab"
import { fetchPlayerStats } from "@/lib/fetch-player-stats"

export const revalidate = 60

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const { season } = await searchParams
  const data = await fetchPlayerStats(season)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader activeTab="stats" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:py-8">
        <Suspense>
          <StatsTab initialData={data} />
        </Suspense>
      </main>
    </div>
  )
}
