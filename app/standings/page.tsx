import { Suspense } from "react"
import { SiteHeader } from "@/components/site-header"
import { StandingsContent } from "@/components/standings-content"
import { fetchBashData } from "@/lib/fetch-bash-data"

export const revalidate = 30

export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const { season } = await searchParams
  const data = season === "all" ? undefined : await fetchBashData(season)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader activeTab="standings" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:py-8">
        <Suspense>
          <StandingsContent initialData={data} />
        </Suspense>
      </main>
    </div>
  )
}
