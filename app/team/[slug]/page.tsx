"use client"

import { use } from "react"
import useSWR from "swr"
import { SiteHeader } from "@/components/site-header"
import { formatGameDate } from "@/lib/format-time"
import { cn } from "@/lib/utils"
import { ChevronLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import type { TeamDetail } from "@/app/api/bash/team/[slug]/route"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data: team, isLoading, error } = useSWR<TeamDetail>(
    `/api/bash/team/${slug}`, fetcher, { revalidateOnFocus: false }
  )

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:py-8">
        <Link
          href="/?tab=standings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5 group"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Standings</span>
        </Link>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">Team not found.</p>
          </div>
        )}

        {team && (
          <div className="flex flex-col gap-8">
            <h1 className="text-2xl font-black tracking-tight">{team.name}</h1>

            {/* Roster */}
            {team.roster.length > 0 && (
              <div>
                <SectionHeader>Roster</SectionHeader>
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground/50 text-[9px] uppercase tracking-wider">
                        <th className="text-left font-medium py-2.5 min-w-[140px]">Player</th>
                        <th className="text-center font-medium py-2.5 w-10">GP</th>
                        <th className="text-center font-medium py-2.5 w-10">G</th>
                        <th className="text-center font-medium py-2.5 w-10">A</th>
                        <th className="text-center font-medium py-2.5 w-10 font-bold">PTS</th>
                        <th className="text-center font-medium py-2.5 w-10">PIM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.roster.filter(p => !p.isGoalie).map((p, i) => (
                        <tr key={p.id} className={cn("border-t border-border/20 hover:bg-card/60", i % 2 === 0 && "bg-card/15")}>
                          <td className="py-2 pr-2 text-xs font-semibold">{p.name}</td>
                          <td className="text-center tabular-nums py-2 text-muted-foreground">{p.gp}</td>
                          <td className={cn("text-center tabular-nums py-2", p.goals > 0 && "font-medium")}>{p.goals}</td>
                          <td className={cn("text-center tabular-nums py-2", p.assists > 0 && "font-medium")}>{p.assists}</td>
                          <td className={cn("text-center tabular-nums py-2 font-bold", false)}>{p.points}</td>
                          <td className="text-center tabular-nums py-2 text-muted-foreground">{p.pim}</td>
                        </tr>
                      ))}
                      {team.roster.filter(p => p.isGoalie).length > 0 && (
                        <>
                          <tr><td colSpan={6} className="pt-3 pb-1 text-[9px] uppercase tracking-wider text-muted-foreground/50 font-bold">Goalies</td></tr>
                          {team.roster.filter(p => p.isGoalie).map((p, i) => (
                            <tr key={p.id} className={cn("border-t border-border/20 hover:bg-card/60", i % 2 === 0 && "bg-card/15")}>
                              <td className="py-2 pr-2 text-xs font-semibold">{p.name}</td>
                              <td className="text-center tabular-nums py-2 text-muted-foreground">{p.gp}</td>
                              <td className="text-center tabular-nums py-2 text-muted-foreground">-</td>
                              <td className="text-center tabular-nums py-2 text-muted-foreground">-</td>
                              <td className="text-center tabular-nums py-2 text-muted-foreground">-</td>
                              <td className="text-center tabular-nums py-2 text-muted-foreground">{p.pim}</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Schedule/Results */}
            <div>
              <SectionHeader>Schedule</SectionHeader>
              <div className="flex flex-col gap-1">
                {team.games.map((g) => {
                  const row = (
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                      g.status === "final" && "hover:bg-card/60 transition-colors"
                    )}>
                      <span className="text-[10px] text-muted-foreground/60 font-medium w-20 shrink-0">
                        {formatGameDate(g.date)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/40 w-6 shrink-0 text-center">
                        {g.isHome ? "vs" : "@"}
                      </span>
                      <Link href={`/team/${g.opponentSlug}`} className="text-xs font-medium text-foreground hover:text-primary transition-colors flex-1">
                        {g.opponent}
                      </Link>
                      {g.status === "final" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono tabular-nums font-medium text-muted-foreground">
                            {g.result}{g.isOvertime && g.result && ""}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-foreground">
                            {g.teamScore}-{g.opponentScore}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">{g.time}</span>
                      )}
                    </div>
                  )

                  if (g.status === "final") {
                    return <Link key={g.id} href={`/game/${g.id}`}>{row}</Link>
                  }
                  return <div key={g.id}>{row}</div>
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground whitespace-nowrap">
        {children}
      </h4>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  )
}
