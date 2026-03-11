export function ScorekeeperSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground whitespace-nowrap">
        {children}
      </h4>
      <div className="h-px flex-1 bg-border/40" />
    </div>
  )
}
