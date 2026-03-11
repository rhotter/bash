import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { RosterPlayer } from "@/lib/scorekeeper-types"

export function GoalieSelect({ label, players, value, onChange }: {
  label: string; players: RosterPlayer[]; value: string; onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground shrink-0 w-28 truncate">{label} goalie</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs flex-1">
          <SelectValue placeholder="Select goalie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No goalie</SelectItem>
          {players.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
