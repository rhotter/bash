import { SiteHeader } from "@/components/site-header"
import { TeamPageContent } from "@/components/team-page-content"
import { fetchTeamDetail } from "@/lib/fetch-team-detail"
import { notFound } from "next/navigation"

export const revalidate = 60

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const { slug } = await params
  const { season } = await searchParams
  const team = await fetchTeamDetail(slug, season)

  if (!team) notFound()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:py-8">
        <TeamPageContent team={team} />
      </main>
    </div>
  )
}
