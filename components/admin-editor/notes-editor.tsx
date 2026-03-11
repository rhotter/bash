"use client"

import type { LiveGameState } from "@/lib/scorekeeper-types"

export function NotesEditor({ state, onChange }: {
  state: LiveGameState
  onChange: (notes: string) => void
}) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Notes</h3>
      <textarea
        value={state.notes}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        placeholder="Game notes..."
      />
    </div>
  )
}
