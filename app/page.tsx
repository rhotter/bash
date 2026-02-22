"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { ScoresTab } from "@/components/scores-tab"
import { StandingsTab } from "@/components/standings-tab"
import { StatsTab } from "@/components/stats-tab"
import { useBashData, usePlayerStats } from "@/lib/hockey-data"
import { cn } from "@/lib/utils"

const VALID_TABS = ["scores", "standings", "stats"] as const
type Tab = (typeof VALID_TABS)[number]

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}

function HomeContent() {
  const { games, standings, isLoading } = useBashData()
  usePlayerStats() // prefetch
  const searchParams = useSearchParams()
  const router = useRouter()
  const rawTab = searchParams.get("tab")
  const tab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "scores"

  const setTab = (t: Tab) => {
    const params = new URLSearchParams()
    if (t !== "scores") {
      params.set("tab", t)
    }
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : "/", { scroll: false })
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-2 md:py-4">
        {/* Tab navigation */}
        <div className="flex items-center gap-0 mb-6 border-b border-border/40">
          {VALID_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative text-sm font-semibold px-4 py-3 transition-colors min-h-[44px] md:min-h-0 capitalize",
                tab === t
                  ? "text-foreground"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              )}
            >
              {t}
              {tab === t && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {tab === "scores" && <ScoresTab games={games} isLoading={isLoading} />}
        {tab === "standings" && <StandingsTab standings={standings} isLoading={isLoading} />}
        {tab === "stats" && <StatsTab />}
      </main>
    </div>
  )
}
