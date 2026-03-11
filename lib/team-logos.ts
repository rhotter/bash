// Maps team slug substrings to logo filenames in /public/team-logos/
const logoMapping: Record<string, string> = {
  bash: "bash_orange_transparent_1024.png",
  bashers: "bashers_transparent_1024.png",
  landsharks: "landsharks_black_1024.png",
  loons: "loons_1024.png",
  regretzkys: "no_regretzkys_1024.png",
  reign: "reign_1024.png",
  rinkrats: "rinkrats_1024.png",
  "rink-rats": "rinkrats_1024.png",
  seals: "seals_1024.png",
  yetis: "yetis_1024.png",
  "last-licks": "last_licks_blue_1024.png",
  licks: "last_licks_blue_1024.png",
}

export function getTeamLogoUrl(slug: string): string | null {
  const lower = slug.toLowerCase()
  // Try exact match first, then substring
  for (const [key, filename] of Object.entries(logoMapping)) {
    if (lower.includes(key)) {
      return `/team-logos/${filename}`
    }
  }
  return null
}
