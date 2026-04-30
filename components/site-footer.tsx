"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useAdmin } from "@/lib/admin-context"
import { SeasonSelector } from "@/components/season-selector"

export function SiteFooter() {
  const { isAdmin, logout } = useAdmin()

  return (
    <footer className="mt-auto border-t border-border/40 py-6 px-4">
      <div className="mx-auto max-w-6xl flex items-center gap-3">
        <Suspense fallback={null}>
          <SeasonSelector />
        </Suspense>
        <div className="ml-auto flex items-center gap-3">
        <Link href="/scorekeeper" className="text-xs text-muted-foreground/30 hover:text-muted-foreground transition-colors">
          Scorekeeper
        </Link>
        {isAdmin ? (
          <>
            <Link href="/admin/seasons" className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">
              Admin
            </Link>
            <button
              onClick={logout}
              className="text-xs text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-pointer"
            >
              Exit Admin
            </button>
          </>
        ) : (
          <Link
            href="/admin"
            className="text-xs text-muted-foreground/30 hover:text-muted-foreground transition-colors"
          >
            Admin
          </Link>
        )}
        </div>
      </div>
    </footer>
  )
}
