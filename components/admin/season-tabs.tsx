"use client"

import { useState } from "react"
import { SeasonOverview } from "./season-overview"
import { SeasonForm } from "./season-form"
import { PlaceholderCard } from "./placeholder-card"

type Tab = "Overview" | "Settings" | "Teams" | "Roster" | "Schedule" | "Draft" | "Registration"

function getTabsForStatus(status: string): Tab[] {
  const base: Tab[] = ["Overview", "Settings", "Teams", "Roster", "Schedule"]
  if (status === "draft") {
    return [...base, "Draft", "Registration"]
  }
  return base
}

interface SeasonTabsProps {
  season: {
    id: string
    name: string
    seasonType: string
    leagueId: string | null
    status: string
    standingsMethod: string | null
    gameLength: number | null
    defaultLocation: string | null
    adminNotes: string | null
    statsOnly: boolean
    isCurrent: boolean
    teams: { teamSlug: string; teamName: string }[]
    gameCount: number
    completedGameCount: number
    playerCount: number
    recentGames?: { id: number; date: string; time: string | null; awayTeam: string; homeTeam: string; location: string | null }[]
    upcomingGames?: { id: number; date: string; time: string | null; awayTeam: string; homeTeam: string; location: string | null }[]
  }
}

export function SeasonTabs({ season }: SeasonTabsProps) {
  const tabs = getTabsForStatus(season.status)
  const [activeTab, setActiveTab] = useState<Tab>("Overview")

  return (
    <div className="space-y-4">
      {/* Tab Buttons */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "Overview" && <SeasonOverview season={season} onEditSettings={() => setActiveTab("Settings")} />}
        {activeTab === "Settings" && <SeasonForm season={season} />}
        {activeTab === "Teams" && <PlaceholderCard title="Team Management" phase={2} />}
        {activeTab === "Roster" && <PlaceholderCard title="Roster Management" phase={2} />}
        {activeTab === "Schedule" && <PlaceholderCard title="Schedule Editor" phase={2} />}
        {activeTab === "Draft" && (
          <PlaceholderCard
            title="Draft Setup"
            phase={2}
            description="Configure the draft format: number of rounds, protection list sizes (2–10 per BASH rules), draft order based on previous season standings, and supplemental draft rules."
          />
        )}
        {activeTab === "Registration" && (
          <PlaceholderCard
            title="Player Registration"
            phase={2}
            description="Manage player registration for the upcoming season. Track veteran returns, free agent declarations, rookie signups from pickups, and registration fee status."
          />
        )}
      </div>
    </div>
  )
}

