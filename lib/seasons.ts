export interface Season {
  id: string
  name: string
  leagueId: string
}

// All 57 BASH seasons from Sportability (oldest to newest)
export const SEASONS: Season[] = [
  { id: "1997-1998-playoffs", name: "1997-1998 Playoffs Only", leagueId: "47943" },
  { id: "1999-summer", name: "1999 Summer", leagueId: "5" },
  { id: "1999-2000", name: "1999-2000", leagueId: "14" },
  { id: "2000-summer", name: "2000 Summer", leagueId: "229" },
  { id: "2000-2001", name: "2000-2001", leagueId: "503" },
  { id: "2001-summer", name: "2001 Summer", leagueId: "1189" },
  { id: "2001-2002", name: "2001-2002", leagueId: "1265" },
  { id: "2002-summer", name: "2002 Summer", leagueId: "1900" },
  { id: "2002-2003", name: "2002-2003", leagueId: "1901" },
  { id: "2003-summer", name: "2003 Summer", leagueId: "4058" },
  { id: "2003-2004", name: "2003-2004", leagueId: "4059" },
  { id: "2003-2004-rookie", name: "2003-2004 Rookie Registration", leagueId: "4650" },
  { id: "2004-summer", name: "2004 Summer", leagueId: "6487" },
  { id: "2004-2005", name: "2004-2005", leagueId: "6486" },
  { id: "2005-summer", name: "2005 Summer", leagueId: "8949" },
  { id: "2005-2006", name: "2005-2006", leagueId: "9865" },
  { id: "2006-summer", name: "2006 Summer", leagueId: "11884" },
  { id: "2006-2007", name: "2006-2007", leagueId: "12855" },
  { id: "2007-summer", name: "2007 Summer", leagueId: "15097" },
  { id: "2007-2008", name: "2007-2008", leagueId: "15982" },
  { id: "2008-summer", name: "2008 Summer", leagueId: "18149" },
  { id: "2008-2009", name: "2008-2009", leagueId: "18903" },
  { id: "2009-summer", name: "2009 Summer", leagueId: "21199" },
  { id: "2009-2010", name: "2009-2010", leagueId: "22285" },
  { id: "2010-summer", name: "2010 Summer", leagueId: "24698" },
  { id: "2010-2011", name: "2010-2011", leagueId: "25762" },
  { id: "2011-summer", name: "2011 Summer", leagueId: "28742" },
  { id: "2011-2012", name: "2011-2012", leagueId: "29373" },
  { id: "2012-summer", name: "2012 Summer", leagueId: "31937" },
  { id: "2012-2013", name: "2012-2013", leagueId: "32866" },
  { id: "2013-summer", name: "2013 Summer", leagueId: "35021" },
  { id: "2013-2014", name: "2013-2014", leagueId: "35746" },
  { id: "2014-summer", name: "2014 Summer", leagueId: "37780" },
  { id: "2014-2015", name: "2014-2015", leagueId: "38418" },
  { id: "2015-summer", name: "2015 Summer", leagueId: "40218" },
  { id: "2015-2016", name: "2015-2016", leagueId: "41205" },
  { id: "2016-summer", name: "2016 Summer", leagueId: "42385" },
  { id: "2016-2017", name: "2016-2017", leagueId: "42830" },
  { id: "2017-summer", name: "2017 Summer", leagueId: "44083" },
  { id: "2017-2018", name: "2017-18", leagueId: "44570" },
  { id: "2018-summer", name: "2018 Summer", leagueId: "45663" },
  { id: "2018-2019", name: "2018-19", leagueId: "46192" },
  { id: "2019-summer", name: "2019 Summer", leagueId: "47083" },
  { id: "2019-2020", name: "2019-2020", leagueId: "47353" },
  { id: "2021-summer", name: "2021 Summer", leagueId: "48503" },
  { id: "2021-2022", name: "2021-2022", leagueId: "48607" },
  { id: "2022-summer", name: "2022 Summer", leagueId: "48952" },
  { id: "2022-2023", name: "2022-2023", leagueId: "49109" },
  { id: "2023-summer", name: "2023 Summer", leagueId: "49433" },
  { id: "2023-2024", name: "2023-2024", leagueId: "49644" },
  { id: "2024-summer", name: "2024 Summer", leagueId: "49903" },
  { id: "2024-2025", name: "2024-2025", leagueId: "50076" },
  { id: "2025-2026", name: "2025-2026", leagueId: "50562" },
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
