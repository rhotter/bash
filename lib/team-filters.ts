// TODO: Remove once legacy seed-* and tbd teams are cleaned from production.

export function isLegacyTeamSlug(slug: string): boolean {
  return slug === "tbd" || slug.startsWith("seed-")
}

export function filterLegacyTeams<T extends { slug: string }>(items: T[]): T[] {
  return items.filter((t) => !isLegacyTeamSlug(t.slug))
}
