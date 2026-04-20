import { Construction } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function PlaceholderCard({ title, phase, description }: { title: string; phase: number; description?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Construction className="h-8 w-8 text-muted-foreground mb-3" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Coming in Phase {phase}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-3 max-w-md leading-relaxed">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

