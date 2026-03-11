"use client"

import { Input } from "@/components/ui/input"
import type { LiveGameState } from "@/lib/scorekeeper-types"

export function OfficialsEditor({ state, onChange }: {
  state: LiveGameState
  onChange: (officials: LiveGameState["officials"]) => void
}) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Officials</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ref 1</label>
          <Input
            value={state.officials.ref1}
            onChange={(e) => onChange({ ...state.officials, ref1: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ref 2</label>
          <Input
            value={state.officials.ref2}
            onChange={(e) => onChange({ ...state.officials, ref2: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Scorekeeper</label>
          <Input
            value={state.officials.scorekeeper}
            onChange={(e) => onChange({ ...state.officials, scorekeeper: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  )
}
