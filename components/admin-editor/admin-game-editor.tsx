"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import type { LiveGameState, RosterPlayer } from "@/lib/scorekeeper-types"
import { GoalsEditor } from "./goals-editor"
import { PenaltiesEditor } from "./penalties-editor"
import { ShotsEditor } from "./shots-editor"
import { AttendanceEditor } from "./attendance-editor"
import { GoaliePullsEditor } from "./goalie-pulls-editor"
import { GoalieChangesEditor } from "./goalie-changes-editor"
import { OfficialsEditor } from "./officials-editor"
import { NotesEditor } from "./notes-editor"
import { ThreeStarsEditor } from "./three-stars-editor"
import { ShootoutEditor } from "./shootout-editor"

interface AdminGameEditorProps {
  gameId: string
  state: LiveGameState
  pin: string
  homeSlug: string
  awaySlug: string
  homeTeam: string
  awayTeam: string
  homeRoster: RosterPlayer[]
  awayRoster: RosterPlayer[]
  playerNames: Record<number, string>
  onClose: () => void
  onSaved: () => void
}

export function AdminGameEditor({
  gameId, state: initialState, pin,
  homeSlug, awaySlug, homeTeam, awayTeam,
  homeRoster, awayRoster, playerNames,
  onClose, onSaved,
}: AdminGameEditorProps) {
  const [state, setState] = useState<LiveGameState>(() => {
    const s = structuredClone(initialState)
    // Ensure optional array fields exist (older games may not have them)
    if (!s.goaliePulls) s.goaliePulls = []
    if (!s.goalieChanges) s.goalieChanges = []
    if (!s.timeouts) s.timeouts = []
    return s
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const nameById = useCallback((id: number | null): string | null => {
    if (id == null) return null
    if (playerNames[id]) return playerNames[id]
    const allRoster = [...homeRoster, ...awayRoster]
    const player = allRoster.find((p) => p.id === id)
    return player?.name ?? `#${id}`
  }, [playerNames, homeRoster, awayRoster])

  function updateState(patch: Partial<LiveGameState>) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      // 1. Save state
      const stateRes = await fetch(`/api/bash/scorekeeper/${gameId}/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-pin": pin },
        body: JSON.stringify({ ...state, updatedAt: Date.now() }),
      })
      if (!stateRes.ok) {
        const data = await stateRes.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save state")
      }

      // 2. Re-finalize
      const finalizeRes = await fetch(`/api/bash/scorekeeper/${gameId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pin": pin },
      })
      if (!finalizeRes.ok) {
        const data = await finalizeRes.json().catch(() => ({}))
        throw new Error(data.error || "Failed to finalize")
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/60 -mx-4 px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="text-sm font-medium truncate">
          Editing: <span className="text-muted-foreground">{awayTeam} @ {homeTeam}</span>
        </div>
        {error && <span className="text-xs text-destructive">{error}</span>}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving} className="text-xs h-8">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="text-xs h-8">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

      {/* Editor sections */}
      <div className="space-y-8">
        <GoalsEditor
          state={state}
          onChange={(goals) => updateState({ goals })}
          homeSlug={homeSlug} awaySlug={awaySlug}
          homeTeam={homeTeam} awayTeam={awayTeam}
          homeRoster={homeRoster} awayRoster={awayRoster}
          nameById={nameById}
        />

        <PenaltiesEditor
          state={state}
          onChange={(penalties) => updateState({ penalties })}
          homeSlug={homeSlug} awaySlug={awaySlug}
          homeTeam={homeTeam} awayTeam={awayTeam}
          homeRoster={homeRoster} awayRoster={awayRoster}
          nameById={nameById}
        />

        <ShotsEditor
          state={state}
          onChange={updateState}
          homeTeam={homeTeam} awayTeam={awayTeam}
        />

        <AttendanceEditor
          state={state}
          onChange={updateState}
          homeSlug={homeSlug} awaySlug={awaySlug}
          homeTeam={homeTeam} awayTeam={awayTeam}
          homeRoster={homeRoster} awayRoster={awayRoster}
        />

        <GoaliePullsEditor
          state={state}
          onChange={(goaliePulls) => updateState({ goaliePulls })}
          homeSlug={homeSlug} awaySlug={awaySlug}
          homeTeam={homeTeam} awayTeam={awayTeam}
        />

        <GoalieChangesEditor
          state={state}
          onChange={(goalieChanges) => updateState({ goalieChanges })}
          homeSlug={homeSlug} awaySlug={awaySlug}
          homeTeam={homeTeam} awayTeam={awayTeam}
          homeRoster={homeRoster} awayRoster={awayRoster}
          nameById={nameById}
        />

        <OfficialsEditor
          state={state}
          onChange={(officials) => updateState({ officials })}
        />

        <ThreeStarsEditor
          state={state}
          onChange={(threeStars) => updateState({ threeStars })}
          homeRoster={homeRoster} awayRoster={awayRoster}
        />

        <ShootoutEditor
          state={state}
          onChange={(shootout) => updateState({ shootout })}
          homeSlug={homeSlug} awaySlug={awaySlug}
          homeTeam={homeTeam} awayTeam={awayTeam}
          homeRoster={homeRoster} awayRoster={awayRoster}
        />

        <NotesEditor
          state={state}
          onChange={(notes) => updateState({ notes })}
        />
      </div>
    </div>
  )
}
