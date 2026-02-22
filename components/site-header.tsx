import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4 md:h-14">
        <Link href="/" className="flex items-center gap-3 group">
          <HockeyStickIcon />
          <div className="flex flex-col">
            <span className="text-[13px] font-bold leading-tight tracking-tight text-foreground md:text-sm">
              Bay Area Street Hockey
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 md:text-[10px]">
              BASH 2025-2026
            </span>
          </div>
        </Link>
      </div>
    </header>
  )
}

function HockeyStickIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-primary md:h-8 md:w-8"
    >
      <path d="M4 20 L4 16 Q4 14 6 14 L10 14" />
      <path d="M6 14 L20 4" />
      <circle cx="14" cy="18" r="2.5" fill="currentColor" stroke="none" opacity="0.3" />
    </svg>
  )
}
