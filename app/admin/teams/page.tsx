import { TeamsClient } from "./teams-client"

export const metadata = {
  title: "Team Management | Admin",
}

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-1">Manage global franchises and edit team names.</p>
        </div>
      </div>
      <TeamsClient />
    </div>
  )
}
