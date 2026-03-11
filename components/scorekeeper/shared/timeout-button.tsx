import { Button } from "@/components/ui/button"

export function TimeoutButton({
  used, max, onUse,
}: {
  used: number; max: number; onUse: () => void
}) {
  const remaining = max - used
  return (
    <Button variant="outline" className="w-full h-9 text-xs text-muted-foreground" onClick={onUse} disabled={remaining <= 0}>
      Timeout ({remaining} left)
    </Button>
  )
}
