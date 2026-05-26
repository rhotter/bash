import type { Metadata } from "next"
import { getSession } from "@/lib/admin-session"
import { AdminLoginGate } from "@/components/admin/admin-login-gate"

export const metadata: Metadata = {
  title: "Game Scoresheet | BASH Admin",
  description: "Printable game scoresheet for Bay Area Street Hockey.",
}

export default async function ScoresheetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuthenticated = await getSession()

  if (!isAuthenticated) {
    return <AdminLoginGate />
  }

  return (
    <div className="bg-white text-black">
      {children}
    </div>
  )
}
