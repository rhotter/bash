/**
 * Schedule generation utilities for BASH league admin.
 *
 * Pure functions — no side effects, no database calls.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RoundRobinSlot {
  round: number
  home: number // team index (0-based)
  away: number // team index (0-based)
}

export interface GeneratedGame {
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  location: string
  gameType: string
  status: string
  homePlaceholder?: string | null
  awayPlaceholder?: string | null
  bracketRound?: string | null
  seriesId?: string | null
  seriesGameNumber?: number | null
  nextGameId?: string | null
  nextGameSlot?: string | null
  id?: string
}

export interface BracketConfig {
  numTeams: number       // 4 or 5
  playIn: boolean        // true if 5th team needs a play-in
  semiSeriesLength: 1 | 3
  finalSeriesLength: 1 | 3
  seeds: string[]        // team slugs in seeded order (index 0 = #1 seed)
  usePlaceholders: boolean // true → use "Seed 1" labels instead of real teams
}

export interface BracketGame {
  id: string
  homeTeam: string
  awayTeam: string
  homePlaceholder: string | null
  awayPlaceholder: string | null
  bracketRound: string
  seriesId: string
  seriesGameNumber: number
  nextGameId: string | null
  nextGameSlot: "home" | "away" | null
  gameType: string
  status: string
  date: string
  time: string
  location: string
}

export interface SeriesGame {
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: string
}

// ─── Round Robin (Berger tables) ────────────────────────────────────────────

/**
 * Generate a round-robin schedule using the Berger tables algorithm.
 *
 * @param numTeams      Number of teams (will be bumped to even if odd via a "bye" team).
 * @param gamesPerWeek  How many games are played each "week" / round.
 * @param cycles        How many full round-robin cycles to generate.
 * @returns             Array of { round, home, away } using 0-based team indices.
 */
export function generateRoundRobin(
  numTeams: number,
  gamesPerWeek: number,
  cycles: number = 1
): RoundRobinSlot[] {
  if (numTeams < 2) return []

  // If odd, add a "bye" sentinel — team at index `n` is the bye.
  const n = numTeams % 2 === 0 ? numTeams : numTeams + 1
  const hasBye = numTeams % 2 !== 0

  // Berger tables: fix team 0, rotate teams 1..n-1
  const totalRounds = n - 1
  const matchesPerRound = n / 2

  const allSlots: RoundRobinSlot[] = []

  for (let cycle = 0; cycle < cycles; cycle++) {
    for (let round = 0; round < totalRounds; round++) {
      const roundNum = cycle * totalRounds + round + 1
      const teams: number[] = [0]
      for (let i = 1; i < n; i++) {
        // Rotate positions 1..n-1
        const pos = ((i - 1 + round) % (n - 1)) + 1
        teams.push(pos)
      }

      for (let match = 0; match < matchesPerRound; match++) {
        const home = teams[match]
        const away = teams[n - 1 - match]

        // Skip bye matches
        if (hasBye && (home >= numTeams || away >= numTeams)) continue

        // Alternate home/away by round for fairness
        if (round % 2 === 0) {
          allSlots.push({ round: roundNum, home, away })
        } else {
          allSlots.push({ round: roundNum, home: away, away: home })
        }
      }
    }
  }

  // Now chunk into weeks based on gamesPerWeek
  // Each "week" gets gamesPerWeek games from the flat list in order
  if (gamesPerWeek > 0 && gamesPerWeek < matchesPerRound) {
    const reNumbered: RoundRobinSlot[] = []
    let weekNum = 1
    for (let i = 0; i < allSlots.length; i++) {
      reNumbered.push({ ...allSlots[i], round: weekNum })
      if ((i + 1) % gamesPerWeek === 0) weekNum++
    }
    return reNumbered
  }

  return allSlots
}

/**
 * Map generic round-robin slots to real teams and dates.
 *
 * @param slots         Output of generateRoundRobin()
 * @param teamSlugs     Ordered team slugs (index = team number from slots)
 * @param weekDates     Map of week number → array of { date, time, location }
 * @param gameType      Default game type for all generated games
 */
export function mapRoundRobinToGames(
  slots: RoundRobinSlot[],
  teamSlugs: string[],
  weekDates: Record<number, { date: string; time: string; location: string }[]>,
  gameType: string = "regular"
): GeneratedGame[] {
  const games: GeneratedGame[] = []

  // Group slots by week/round
  const byWeek: Record<number, RoundRobinSlot[]> = {}
  for (const s of slots) {
    if (!byWeek[s.round]) byWeek[s.round] = []
    byWeek[s.round].push(s)
  }

  for (const weekStr of Object.keys(byWeek).sort((a, b) => +a - +b)) {
    const week = +weekStr
    const weekSlots = byWeek[week]
    const dates = weekDates[week] || []

    for (let i = 0; i < weekSlots.length; i++) {
      const slot = weekSlots[i]
      const dateInfo = dates[i] || { date: "", time: "TBD", location: "James Lick Arena" }

      games.push({
        date: dateInfo.date,
        time: dateInfo.time,
        homeTeam: teamSlugs[slot.home] ?? "tbd",
        awayTeam: teamSlugs[slot.away] ?? "tbd",
        location: dateInfo.location,
        gameType,
        status: "upcoming",
      })
    }
  }

  return games
}

// ─── Playoff Bracket ────────────────────────────────────────────────────────

/**
 * Generate a playoff bracket for the BASH league.
 *
 * Supports:
 * - 4 teams: SF-A (#1 vs #4), SF-B (#2 vs #3), Final
 * - 5 teams: Play-in (#4 vs #5) → SF-A (#1 vs play-in winner), SF-B (#2 vs #3), Final
 * - Series lengths of 1 or 3 per round
 *
 * Returns fully linked games with nextGameId/nextGameSlot references.
 */
export function generateBracket(config: BracketConfig): BracketGame[] {
  const { numTeams, playIn, semiSeriesLength, finalSeriesLength, seeds, usePlaceholders } = config

  const games: BracketGame[] = []
  let idCounter = 1
  const makeId = () => `playoff-${idCounter++}`

  // Pre-generate all IDs so we can link them
  const playInIds: string[] = playIn ? [makeId()] : []

  const sfaIds: string[] = []
  for (let i = 0; i < semiSeriesLength; i++) sfaIds.push(makeId())

  const sfbIds: string[] = []
  for (let i = 0; i < semiSeriesLength; i++) sfbIds.push(makeId())

  const finalIds: string[] = []
  for (let i = 0; i < finalSeriesLength; i++) finalIds.push(makeId())

  // The "destination" game for each series winner
  // SF-A winner → Final (home slot)
  // SF-B winner → Final (away slot)
  const finalFirstId = finalIds[0]

  // Helper to resolve seed to team slug or placeholder
  const teamOrTbd = (seedIndex: number): { slug: string; placeholder: string | null } => {
    if (seedIndex >= seeds.length || usePlaceholders) {
      return { slug: "tbd", placeholder: `Seed ${seedIndex + 1}` }
    }
    return { slug: seeds[seedIndex], placeholder: null }
  }

  // ─── Play-in game (if 5 teams) ──────────────────────────
  if (playIn && numTeams >= 5) {
    const seed4 = teamOrTbd(3)
    const seed5 = teamOrTbd(4)

    games.push({
      id: playInIds[0],
      homeTeam: seed4.slug,
      awayTeam: seed5.slug,
      homePlaceholder: seed4.placeholder,
      awayPlaceholder: seed5.placeholder,
      bracketRound: "play-in",
      seriesId: "play-in",
      seriesGameNumber: 1,
      nextGameId: sfaIds[0],
      nextGameSlot: "away", // play-in winner becomes away in SF-A (vs #1 seed at home)
      gameType: "playoff",
      status: "upcoming",
      date: "",
      time: "TBD",
      location: "James Lick Arena",
    })
  }

  // ─── Semi-final A ──────────────────────────────────────
  {
    const seed1 = teamOrTbd(0) // #1 seed always home in SF-A
    const sfaAway = playIn
      ? { slug: "tbd", placeholder: "Play-in Winner" }
      : teamOrTbd(3) // #4 seed if no play-in

    for (let g = 0; g < semiSeriesLength; g++) {
      // Only the last game in the series links to the final
      // (in practice, advancement is determined dynamically by the API,
      //  but we link the first game of the series for bracket resolution)
      games.push({
        id: sfaIds[g],
        homeTeam: g % 2 === 0 ? seed1.slug : sfaAway.slug, // alternate home ice
        awayTeam: g % 2 === 0 ? sfaAway.slug : seed1.slug,
        homePlaceholder: g % 2 === 0 ? seed1.placeholder : sfaAway.placeholder,
        awayPlaceholder: g % 2 === 0 ? sfaAway.placeholder : seed1.placeholder,
        bracketRound: "semifinal",
        seriesId: "sf-a",
        seriesGameNumber: g + 1,
        nextGameId: g === 0 ? finalFirstId : null, // link series to next round via first game
        nextGameSlot: g === 0 ? "home" : null,
        gameType: "playoff",
        status: "upcoming",
        date: "",
        time: "TBD",
        location: "James Lick Arena",
      })
    }
  }

  // ─── Semi-final B ──────────────────────────────────────
  {
    const seed2 = teamOrTbd(1)
    const seed3 = teamOrTbd(2)

    for (let g = 0; g < semiSeriesLength; g++) {
      games.push({
        id: sfbIds[g],
        homeTeam: g % 2 === 0 ? seed2.slug : seed3.slug,
        awayTeam: g % 2 === 0 ? seed3.slug : seed2.slug,
        homePlaceholder: g % 2 === 0 ? seed2.placeholder : seed3.placeholder,
        awayPlaceholder: g % 2 === 0 ? seed3.placeholder : seed2.placeholder,
        bracketRound: "semifinal",
        seriesId: "sf-b",
        seriesGameNumber: g + 1,
        nextGameId: g === 0 ? finalFirstId : null,
        nextGameSlot: g === 0 ? "away" : null,
        gameType: "playoff",
        status: "upcoming",
        date: "",
        time: "TBD",
        location: "James Lick Arena",
      })
    }
  }

  // ─── Final ─────────────────────────────────────────────
  {
    const finalHome = { slug: "tbd", placeholder: "Winner SF-A" }
    const finalAway = { slug: "tbd", placeholder: "Winner SF-B" }

    for (let g = 0; g < finalSeriesLength; g++) {
      games.push({
        id: finalIds[g],
        homeTeam: g % 2 === 0 ? finalHome.slug : finalAway.slug,
        awayTeam: g % 2 === 0 ? finalAway.slug : finalHome.slug,
        homePlaceholder: g % 2 === 0 ? finalHome.placeholder : finalAway.placeholder,
        awayPlaceholder: g % 2 === 0 ? finalAway.placeholder : finalHome.placeholder,
        bracketRound: "final",
        seriesId: "final",
        seriesGameNumber: g + 1,
        nextGameId: null,
        nextGameSlot: null,
        gameType: "playoff",
        status: "upcoming",
        date: "",
        time: "TBD",
        location: "James Lick Arena",
      })
    }
  }

  return games
}

// ─── Series Clinch Check ────────────────────────────────────────────────────

/**
 * Given all games in a series, determine if a team has clinched.
 *
 * @param seriesGames   All games with the same seriesId
 * @param seriesLength  Total possible games in the series (1 or 3)
 * @returns             { clinched, winner } where winner is a team slug or null
 */
export function checkSeriesClinch(
  seriesGames: SeriesGame[],
  seriesLength: 1 | 3
): { clinched: boolean; winner: string | null } {
  const winsNeeded = Math.ceil(seriesLength / 2)
  const wins: Record<string, number> = {}

  for (const game of seriesGames) {
    if (game.status !== "final" || game.homeScore === null || game.awayScore === null) continue

    const winner = game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam
    wins[winner] = (wins[winner] || 0) + 1
  }

  for (const [team, count] of Object.entries(wins)) {
    if (count >= winsNeeded) {
      return { clinched: true, winner: team }
    }
  }

  return { clinched: false, winner: null }
}
