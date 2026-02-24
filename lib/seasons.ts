export type SeasonType = "summer" | "fall"

export interface Season {
  id: string
  name: string
  leagueId: string
  seasonType: SeasonType
  statsOnly?: boolean
}

// All BASH seasons (oldest to newest)
// Pre-Sportability seasons (1991-1999) have aggregate stats only — no per-game data
export const SEASONS: Season[] = [
  { id: "1991-1992", name: "1991-1992", leagueId: "", seasonType: "fall", statsOnly: true },
  { id: "1992-1993", name: "1992-1993", leagueId: "", seasonType: "fall", statsOnly: true },
  { id: "1993-1994", name: "1993-1994", leagueId: "", seasonType: "fall", statsOnly: true },
  { id: "1994-1995", name: "1994-1995", leagueId: "", seasonType: "fall", statsOnly: true },
  { id: "1995-1996", name: "1995-1996", leagueId: "", seasonType: "fall", statsOnly: true },
  { id: "1996-1997", name: "1996-1997", leagueId: "", seasonType: "fall", statsOnly: true },
  { id: "1997-1998", name: "1997-1998", leagueId: "", seasonType: "fall", statsOnly: true },
  { id: "1998-1999", name: "1998-1999", leagueId: "", seasonType: "fall", statsOnly: true },
  { id: "1997-1998-playoffs", name: "1997-1998 Playoffs Only", leagueId: "47943", seasonType: "fall" },
  { id: "1999-summer", name: "1999 Summer", leagueId: "5", seasonType: "summer" },
  { id: "1999-2000", name: "1999-2000", leagueId: "14", seasonType: "fall" },
  { id: "2000-summer", name: "2000 Summer", leagueId: "229", seasonType: "summer" },
  { id: "2000-2001", name: "2000-2001", leagueId: "503", seasonType: "fall" },
  { id: "2001-summer", name: "2001 Summer", leagueId: "1189", seasonType: "summer" },
  { id: "2001-2002", name: "2001-2002", leagueId: "1265", seasonType: "fall" },
  { id: "2002-summer", name: "2002 Summer", leagueId: "1900", seasonType: "summer" },
  { id: "2002-2003", name: "2002-2003", leagueId: "1901", seasonType: "fall" },
  { id: "2003-summer", name: "2003 Summer", leagueId: "4058", seasonType: "summer" },
  { id: "2003-2004", name: "2003-2004", leagueId: "4059", seasonType: "fall" },
  { id: "2003-2004-rookie", name: "2003-2004 Rookie Registration", leagueId: "4650", seasonType: "fall" },
  { id: "2004-summer", name: "2004 Summer", leagueId: "6487", seasonType: "summer" },
  { id: "2004-2005", name: "2004-2005", leagueId: "6486", seasonType: "fall" },
  { id: "2005-summer", name: "2005 Summer", leagueId: "8949", seasonType: "summer" },
  { id: "2005-2006", name: "2005-2006", leagueId: "9865", seasonType: "fall" },
  { id: "2006-summer", name: "2006 Summer", leagueId: "11884", seasonType: "summer" },
  { id: "2006-2007", name: "2006-2007", leagueId: "12855", seasonType: "fall" },
  { id: "2007-summer", name: "2007 Summer", leagueId: "15097", seasonType: "summer" },
  { id: "2007-2008", name: "2007-2008", leagueId: "15982", seasonType: "fall" },
  { id: "2008-summer", name: "2008 Summer", leagueId: "18149", seasonType: "summer" },
  { id: "2008-2009", name: "2008-2009", leagueId: "18903", seasonType: "fall" },
  { id: "2009-summer", name: "2009 Summer", leagueId: "21199", seasonType: "summer" },
  { id: "2009-2010", name: "2009-2010", leagueId: "22285", seasonType: "fall" },
  { id: "2010-summer", name: "2010 Summer", leagueId: "24698", seasonType: "summer" },
  { id: "2010-2011", name: "2010-2011", leagueId: "25762", seasonType: "fall" },
  { id: "2011-summer", name: "2011 Summer", leagueId: "28742", seasonType: "summer" },
  { id: "2011-2012", name: "2011-2012", leagueId: "29373", seasonType: "fall" },
  { id: "2012-summer", name: "2012 Summer", leagueId: "31937", seasonType: "summer" },
  { id: "2012-2013", name: "2012-2013", leagueId: "32866", seasonType: "fall" },
  { id: "2013-summer", name: "2013 Summer", leagueId: "35021", seasonType: "summer" },
  { id: "2013-2014", name: "2013-2014", leagueId: "35746", seasonType: "fall" },
  { id: "2014-summer", name: "2014 Summer", leagueId: "37780", seasonType: "summer" },
  { id: "2014-2015", name: "2014-2015", leagueId: "38418", seasonType: "fall" },
  { id: "2015-summer", name: "2015 Summer", leagueId: "40218", seasonType: "summer" },
  { id: "2015-2016", name: "2015-2016", leagueId: "41205", seasonType: "fall" },
  { id: "2016-summer", name: "2016 Summer", leagueId: "42385", seasonType: "summer" },
  { id: "2016-2017", name: "2016-2017", leagueId: "42830", seasonType: "fall" },
  { id: "2017-summer", name: "2017 Summer", leagueId: "44083", seasonType: "summer" },
  { id: "2017-2018", name: "2017-18", leagueId: "44570", seasonType: "fall" },
  { id: "2018-summer", name: "2018 Summer", leagueId: "45663", seasonType: "summer" },
  { id: "2018-2019", name: "2018-19", leagueId: "46192", seasonType: "fall" },
  { id: "2019-summer", name: "2019 Summer", leagueId: "47083", seasonType: "summer" },
  { id: "2019-2020", name: "2019-2020", leagueId: "47353", seasonType: "fall" },
  { id: "2021-summer", name: "2021 Summer", leagueId: "48503", seasonType: "summer" },
  { id: "2021-2022", name: "2021-2022", leagueId: "48607", seasonType: "fall" },
  { id: "2022-summer", name: "2022 Summer", leagueId: "48952", seasonType: "summer" },
  { id: "2022-2023", name: "2022-2023", leagueId: "49109", seasonType: "fall" },
  { id: "2023-summer", name: "2023 Summer", leagueId: "49433", seasonType: "summer" },
  { id: "2023-2024", name: "2023-2024", leagueId: "49644", seasonType: "fall" },
  { id: "2024-summer", name: "2024 Summer", leagueId: "49903", seasonType: "summer" },
  { id: "2024-2025", name: "2024-2025", leagueId: "50076", seasonType: "fall" },
  { id: "2025-2026", name: "2025-2026", leagueId: "50562", seasonType: "fall" },
]

const CURRENT_SEASON_ID = "2025-2026"

export function getCurrentSeason(): Season {
  return SEASONS.find((s) => s.id === CURRENT_SEASON_ID)!
}

export function getAllSeasons(): Season[] {
  return [...SEASONS].reverse() // newest first
}

export function getSeasonById(id: string): Season | undefined {
  return SEASONS.find((s) => s.id === id)
}

export function getSeasonByLeagueId(leagueId: string): Season | undefined {
  return SEASONS.find((s) => s.leagueId === leagueId)
}

export function isCurrentSeason(seasonId: string): boolean {
  return seasonId === CURRENT_SEASON_ID
}

export function getSeasonType(seasonId: string): SeasonType {
  return SEASONS.find((s) => s.id === seasonId)?.seasonType ?? (seasonId.includes("summer") ? "summer" : "fall")
}

export function getFallSeasons(): Season[] {
  return SEASONS.filter((s) => s.seasonType === "fall")
}

export function isStatsOnlySeason(seasonId: string): boolean {
  return SEASONS.find((s) => s.id === seasonId)?.statsOnly === true
}

export const STATS_ONLY_SEASON_IDS = SEASONS.filter((s) => s.statsOnly).map((s) => s.id)
