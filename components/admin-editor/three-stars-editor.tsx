"use client"

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { LiveGameState, RosterPlayer } from "@/lib/scorekeeper-types"

export function ThreeStarsEditor({ state, onChange, homeRoster, awayRoster }: {
  state: LiveGameState
  onChange: (stars: number[]) => void
  homeRoster: RosterPlayer[]; awayRoster: RosterPlayer[]
}) {
  const stars = state.threeStars ?? [0, 0, 0]
  const allAttending = [
    ...awayRoster.filter((p) => state.awayAttendance.includes(p.id)),
    ...homeRoster.filter((p) => state.homeAttendance.includes(p.id)),
  ]

  const labels = ["1st Star", "2nd Star", "3rd Star"]

  function setStar(index: number, value: string) {
    const newStars = [...stars]
    newStars[index] = value === "none" ? 0 : parseInt(value)
    onChange(newStars)
  }

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Three Stars</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {labels.map((label, i) => (
          <div key={i}>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
            <Select value={stars[i] ? String(stars[i]) : "none"} onValueChange={(v) => setStar(i, v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allAttending.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  )
}
