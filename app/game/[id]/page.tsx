import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { GamePageContent } from "@/components/game-page-content"
import { fetchGameDetail } from "@/lib/fetch-game-detail"
import { fetchLiveGameData } from "@/lib/fetch-live-game"
import Link from "next/link"

export const revalidate = 30

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const detail = await fetchGameDetail(id)
  if (!detail) return { title: "Game Not Found" }

  const score = detail.homeScore != null && detail.awayScore != null
    ? ` ${detail.homeScore}-${detail.awayScore}`
    : ""
  const title = `${detail.awayTeam} @ ${detail.homeTeam}${score}`
  const ot = detail.isOvertime ? " (OT)" : ""
  const description = detail.status === "final"
    ? `Final${ot}: ${detail.awayTeam} ${detail.awayScore}, ${detail.homeTeam} ${detail.homeScore} - ${detail.date}`
    : `${detail.awayTeam} vs ${detail.homeTeam} - ${detail.date}`

  return { title, description }
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [detail, liveData] = await Promise.all([
    fetchGameDetail(id),
    fetchLiveGameData(id).catch(() => null),
  ])

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:py-8">
        {!detail && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-sm text-muted-foreground">Game not found.</p>
            <Link
              href="/"
              className="text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
            >
              Back to all scores
            </Link>
          </div>
        )}
        {detail && <GamePageContent initialDetail={detail} initialLiveData={liveData} />}
      </main>
    </div>
  )
}
