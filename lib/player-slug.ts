/**
 * Convert a player name to a URL slug: "First Last" -> "first-last"
 * Handles special characters, apostrophes, multiple spaces, etc.
 */
export function playerSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['\u2019]/g, "") // remove apostrophes
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric (keep spaces and hyphens)
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, "") // trim leading/trailing hyphens
}
