import { PlayersClient } from "./players-client"

export const metadata = {
  title: "Player Management | Admin",
}

export default function PlayersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Players</h1>
          <p className="text-muted-foreground mt-1">Manage global player records and merge duplicates.</p>
        </div>
      </div>
      <PlayersClient />
    </div>
  )
}
