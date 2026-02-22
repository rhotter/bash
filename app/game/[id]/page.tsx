"use client"

import { use } from "react"
import { useBashData } from "@/lib/hockey-data"
import { GameDetail } from "@/components/game-detail"
import { SiteHeader } from "@/components/site-header"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { games, isLoading } = useBashData()

  const game = games.find((g) => g.id === id)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:py-8">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading game&hellip;</span>
          </div>
        )}

        {!isLoading && !game && (
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

        {game && <GameDetail game={game} />}
      </main>
    </div>
  )
}
