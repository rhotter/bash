import { SiteHeader } from "@/components/site-header"
import { PlayerPageContent } from "@/components/player-page-content"
import { fetchPlayerDetail } from "@/lib/fetch-player-detail"
import { notFound } from "next/navigation"

export const revalidate = 60

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await fetchPlayerDetail(id)

  if (!player) notFound()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:py-8">
        <PlayerPageContent player={player} />
      </main>
    </div>
  )
}
