"use client"

import type { LiveGameState, RosterPlayer } from "@/lib/scorekeeper-types"
import { AttendanceList } from "@/components/scorekeeper/shared/attendance-list"
import { GoalieSelect } from "@/components/scorekeeper/shared/goalie-select"

export function AttendanceEditor({ state, onChange, homeSlug, awaySlug, homeTeam, awayTeam, homeRoster, awayRoster }: {
  state: LiveGameState
  onChange: (patch: Partial<LiveGameState>) => void
  homeSlug: string; awaySlug: string
  homeTeam: string; awayTeam: string
  homeRoster: RosterPlayer[]; awayRoster: RosterPlayer[]
}) {
  function toggleAttendance(team: string, id: number) {
    const key = team === homeSlug ? "homeAttendance" : "awayAttendance"
    const current = state[key]
    const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    onChange({ [key]: updated })
  }

  function selectAll(team: string) {
    const roster = team === homeSlug ? homeRoster : awayRoster
    const key = team === homeSlug ? "homeAttendance" : "awayAttendance"
    onChange({ [key]: roster.map((p) => p.id) })
  }

  function unselectAll(team: string) {
    const key = team === homeSlug ? "homeAttendance" : "awayAttendance"
    onChange({ [key]: [] })
  }

  function attendingPlayers(teamSlug: string): RosterPlayer[] {
    const roster = teamSlug === homeSlug ? homeRoster : awayRoster
    const attendance = teamSlug === homeSlug ? state.homeAttendance : state.awayAttendance
    return roster.filter((p) => attendance.includes(p.id))
  }

  function currentGoalieId(teamSlug: string): string {
    const gid = teamSlug === homeSlug ? state.homeGoalieId : state.awayGoalieId
    return gid != null ? String(gid) : "none"
  }

  function setGoalie(teamSlug: string, value: string) {
    const key = teamSlug === homeSlug ? "homeGoalieId" : "awayGoalieId"
    onChange({ [key]: value !== "none" ? parseInt(value) : null })
  }

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Attendance</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <AttendanceList
          label={awayTeam} count={state.awayAttendance.length} team={awaySlug}
          roster={awayRoster} attendance={state.awayAttendance}
          onToggle={toggleAttendance} onSelectAll={selectAll} onUnselectAll={unselectAll}
        />
        <AttendanceList
          label={homeTeam} count={state.homeAttendance.length} team={homeSlug}
          roster={homeRoster} attendance={state.homeAttendance}
          onToggle={toggleAttendance} onSelectAll={selectAll} onUnselectAll={unselectAll}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-3">
        <GoalieSelect label={awayTeam} players={attendingPlayers(awaySlug)} value={currentGoalieId(awaySlug)} onChange={(v) => setGoalie(awaySlug, v)} />
        <GoalieSelect label={homeTeam} players={attendingPlayers(homeSlug)} value={currentGoalieId(homeSlug)} onChange={(v) => setGoalie(homeSlug, v)} />
      </div>
    </div>
  )
}
