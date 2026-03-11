import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"

export function ShotCounter({
  label, count, onPlus, onMinus,
}: {
  label: string; count: number; onPlus: () => void; onMinus: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <span className="text-[11px] text-muted-foreground truncate mr-2">{label}</span>
      <div className="flex items-center gap-1.5">
        <Button size="icon-sm" variant="ghost" onClick={onMinus}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="text-lg font-bold font-mono tabular-nums w-6 text-center">{count}</span>
        <Button size="icon-sm" variant="outline" onClick={onPlus}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
