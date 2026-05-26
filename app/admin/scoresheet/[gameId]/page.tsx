import { db, schema, rawSql } from "@/lib/db"
import { eq, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import { AutoPrint } from "./auto-print"
import { BackButton } from "./back-button"

/* ─── Data Fetching ─────────────────────────────────────────────────── */

async function getGameData(gameId: string) {
  const rows = await rawSql(sql`
    SELECT
      g.id, g.date, g.time, g.location, g.is_playoff,
      g.game_type, g.status,
      g.home_team AS home_slug, g.away_team AS away_slug,
      ht.name AS home_name, at.name AS away_name,
      s.name AS season_name, s.id AS season_id
    FROM games g
    LEFT JOIN teams ht ON ht.slug = g.home_team
    LEFT JOIN teams at ON at.slug = g.away_team
    LEFT JOIN seasons s ON s.id = g.season_id
    WHERE g.id = ${gameId}
    LIMIT 1
  `)
  return rows[0] || null
}

async function getRoster(seasonId: string, teamSlug: string, gameId: string, teamSide: "home" | "away") {
  const rows = await rawSql(sql`
    SELECT
      p.name,
      ps.is_captain,
      ps.is_goalie,
      false AS is_sub
    FROM player_seasons ps
    JOIN players p ON p.id = ps.player_id
    WHERE ps.season_id = ${seasonId}
      AND ps.team_slug = ${teamSlug}
    UNION
    SELECT
      p.name,
      false AS is_captain,
      false AS is_goalie,
      agr.is_sub
    FROM adhoc_game_rosters agr
    JOIN players p ON p.id = agr.player_id
    WHERE agr.game_id = ${gameId}
      AND agr.team_side = ${teamSide}
    ORDER BY name ASC
  `)
  return rows as { name: string; is_captain: boolean | null; is_goalie: boolean | null; is_sub: boolean | null }[]
}

async function getOfficials(gameId: string) {
  const rows = await db
    .select({ name: schema.gameOfficials.name, role: schema.gameOfficials.role })
    .from(schema.gameOfficials)
    .where(eq(schema.gameOfficials.gameId, gameId))
  return rows
}

/* ─── Constants ─────────────────────────────────────────────────────── */

const SCORING_ROWS = 11
const PENALTY_ROWS = 11
const GOALIE_ROWS = 3
const SHOT_NUMBERS = Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, "0"))

/* ─── Reusable Sub-Components ───────────────────────────────────────── */

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ height: "22px", borderBottom: "1px solid #000", borderRight: i < cols - 1 ? "1px solid #000" : undefined }}>&nbsp;</td>
      ))}
    </tr>
  )
}

function ScoringTable({ teamName }: { teamName: string }) {
  return (
    <div>
      <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>{teamName} Scoring</div>
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ ...thStyle, width: "10%" }}>Per</th>
            <th style={{ ...thStyle, width: "20%" }}>Time</th>
            <th style={{ ...thStyle, width: "20%" }}>Goal</th>
            <th style={{ ...thStyle, width: "20%" }}>Assist</th>
            <th style={{ ...thStyle, width: "20%" }}>Assist</th>
            <th style={{ ...thStyle, width: "10%" }}>Note</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: SCORING_ROWS }).map((_, i) => <EmptyRow key={i} cols={6} />)}
        </tbody>
      </table>
    </div>
  )
}

function PenaltyTable({ teamName }: { teamName: string }) {
  return (
    <div>
      <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>{teamName} Penalties</div>
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ ...thStyle, width: "8%", whiteSpace: "nowrap" }}>Per</th>
            <th style={{ ...thStyle, width: "20%", whiteSpace: "nowrap" }}>Player</th>
            <th style={{ ...thStyle, width: "28%", whiteSpace: "nowrap" }}>Infraction</th>
            <th style={{ ...thStyle, width: "8%", whiteSpace: "nowrap" }}>Min</th>
            <th style={{ ...thStyle, width: "18%", whiteSpace: "nowrap" }}>Time St</th>
            <th style={{ ...thStyle, width: "18%", whiteSpace: "nowrap" }}>Time Exp</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: PENALTY_ROWS }).map((_, i) => <EmptyRow key={i} cols={6} />)}
        </tbody>
      </table>
    </div>
  )
}

function GoalieTable({ teamName }: { teamName: string }) {
  return (
    <div>
      <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>{teamName} Goalies</div>
      <table style={{ width: "95%", borderCollapse: "collapse", border: "1px solid #000" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ ...thStyle, width: "40%" }}>Goalie</th>
            <th style={{ ...thStyle, width: "15%" }}>Min</th>
            <th style={{ ...thStyle, width: "15%" }}>Sh</th>
            <th style={{ ...thStyle, width: "15%" }}>Sv</th>
            <th style={{ ...thStyle, width: "15%" }}>Dec</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: GOALIE_ROWS }).map((_, i) => <EmptyRow key={i} cols={5} />)}
        </tbody>
      </table>
    </div>
  )
}

function ShotGrid({ label }: { label: string }) {
  return (
    <td style={{ width: "50%", verticalAlign: "top", padding: "3px 4px", border: "1px solid #000" }}>
      <div style={{ fontSize: "9px", fontWeight: "bold", marginBottom: "1px" }}>{label}</div>
      <div style={{ fontSize: "8px", lineHeight: "1.4" }}>
        {SHOT_NUMBERS.slice(0, 8).join(" ")}<br />
        {SHOT_NUMBERS.slice(8, 16).join(" ")}<br />
        {SHOT_NUMBERS.slice(16, 24).join(" ")}
      </div>
    </td>
  )
}

function ShootingPair({ title, labels }: { title: string; labels: [string, string] }) {
  return (
    <div>
      <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
        <tbody>
          <tr>
            <ShotGrid label={labels[0]} />
            <ShotGrid label={labels[1]} />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/* ─── Team Section ──────────────────────────────────────────────────── */

function TeamSection({
  side,
  teamName,
  roster,
}: {
  side: "H" | "A"
  teamName: string
  roster: { name: string; is_captain: boolean | null; is_goalie: boolean | null; is_sub: boolean | null }[]
}) {
  return (
    <>
      {/* First Row: Roster (Left), Scoring (Center), Penalties (Right) */}
      <tr>
        {/* Left Column: Roster */}
        <td style={{ verticalAlign: "top", width: "28%", padding: "0 4px" }}>
          <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>{side} - {teamName} Roster</div>
          <div style={{ fontSize: "9px", lineHeight: "1.35" }}>
            {roster.length > 0
              ? roster.map((p, i) => (
                  <span key={i}>
                    {p.is_captain ? "(c) " : ""}{p.name}{p.is_sub ? " (sub)" : ""}
                    <br />
                  </span>
                ))
              : <span style={{ color: "#999", fontStyle: "italic" }}>No roster available</span>
            }
          </div>
        </td>

        {/* Center Column: Scoring + Per 1 & Per 2 shooting (spans 2 rows) */}
        <td style={{ verticalAlign: "top", width: "36%", padding: "0 4px" }} rowSpan={2}>
          <ScoringTable teamName={teamName} />
          <div style={{ marginTop: "4px" }}>
            <ShootingPair title={`${teamName} Shooting`} labels={["Per 1", "Per 2"]} />
          </div>
        </td>

        {/* Right Column: Penalties + Timeouts / Per 3 & OT shooting (spans 2 rows) */}
        <td style={{ verticalAlign: "top", width: "36%", padding: "0 4px" }} rowSpan={2}>
          <PenaltyTable teamName={teamName} />
          <div style={{ marginTop: "4px" }}>
            <ShootingPair title={`${teamName} Timeouts\u00A0\u00A0\u00A0\u00A01\u00A0\u00A0\u00A0\u00A02`} labels={["Per 3", "OT"]} />
          </div>
        </td>
      </tr>

      {/* Second Row: Goalie Table (Left) */}
      <tr>
        {/* Left Column: Goalies (valigned bottom to align with bottom of center/right columns) */}
        <td style={{ verticalAlign: "bottom", width: "28%", padding: "0 4px", paddingTop: "6px" }}>
          <GoalieTable teamName={teamName} />
        </td>
      </tr>
    </>
  )
}

/* ─── Shared Styles ─────────────────────────────────────────────────── */

const thStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: "normal",
  padding: "2px 3px",
  textAlign: "center",
  borderBottom: "1px solid #000",
  borderRight: "1px solid #000",
}

/* ─── Page Component ────────────────────────────────────────────────── */

export default async function ScoresheetPage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params

  const game = await getGameData(gameId)
  if (!game) notFound()

  const [homeRoster, awayRoster, officials] = await Promise.all([
    getRoster(game.season_id, game.home_slug, gameId, "home"),
    getRoster(game.season_id, game.away_slug, gameId, "away"),
    getOfficials(gameId),
  ])

  const refs = officials.filter(o => o.role === "ref")
  const scorekeepers = officials.filter(o => o.role === "scorekeeper")

  const dateStr = new Date(game.date).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })

  return (
    <>
      <AutoPrint />
      <style>{`
        @page {
          size: letter portrait;
          margin: 0.3cm 0.4cm;
        }
        @media print {
          /* Hide EVERYTHING on the page */
          body * {
            visibility: hidden !important;
          }
          /* Then show ONLY the scoresheet and its children */
          #scoresheet,
          #scoresheet * {
            visibility: visible !important;
          }
          /* Position scoresheet at top-left, ignoring all parent layout */
          #scoresheet {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 6px 10px !important;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
        @media screen {
          body { background: #f0f0f0; }
          .scoresheet-page {
            max-width: 210mm;
            margin: 20px auto;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }
        }
      `}</style>

      <div
        id="scoresheet"
        className="scoresheet-page"
        style={{
          fontFamily: "Tahoma, Verdana, Arial, sans-serif",
          color: "#000",
          backgroundColor: "#fff",
          padding: "8px 12px",
          fontSize: "11px",
        }}
      >
        <BackButton />

        {/* Header */}
        <table style={{ width: "100%", marginBottom: "2px" }}>
          <tbody>
            <tr>
              <td style={{ width: "15%", verticalAlign: "middle" }}>
                <img src="/team-logos/bash_transparent_1024.png" alt="BASH" style={{ width: "48px", height: "48px" }} />
              </td>
              <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                <div style={{ fontWeight: "bold", fontSize: "15px" }}>BASH - {game.season_name} Game Scoresheet</div>
                <div style={{ fontWeight: "bold", fontSize: "12px", marginTop: "2px" }}>{game.away_name} at {game.home_name}</div>
              </td>
              <td style={{ width: "25%", textAlign: "right", verticalAlign: "middle", fontSize: "11px", fontWeight: "bold" }}>
                <div>{dateStr}&nbsp;&nbsp;&nbsp;{game.time}</div>
                <div>{game.location}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <hr style={{ border: "none", borderTop: "1px solid #000", margin: "4px 0" }} />

        {/* ── Home Team Section ── */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <TeamSection side="H" teamName={game.home_name} roster={homeRoster} />
          </tbody>
        </table>

        <hr style={{ border: "none", borderTop: "1px solid #000", margin: "4px 0" }} />

        {/* ── Away Team Section ── */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <TeamSection side="A" teamName={game.away_name} roster={awayRoster} />
          </tbody>
        </table>

        <hr style={{ border: "none", borderTop: "1px solid #000", margin: "4px 0" }} />

        {/* ── Footer ── */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              {/* Signatures */}
              <td style={{ verticalAlign: "top", width: "28%", padding: "0 4px" }}>
                <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>Signatures</div>
                <table style={{ width: "95%", borderCollapse: "collapse", border: "1px solid #000" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "4px 6px", borderBottom: "1px solid #000", fontSize: "10px", height: "22px" }}>
                        Off 1: {refs[0]?.name || ""}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 6px", borderBottom: "1px solid #000", fontSize: "10px", height: "22px" }}>
                        Off 2: {refs[1]?.name || ""}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 6px", fontSize: "10px", height: "22px" }}>
                        SKpr: {scorekeepers[0]?.name || ""}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Scoring Summary */}
              <td style={{ verticalAlign: "top", width: "36%", padding: "0 4px" }}>
                <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>Scoring Summary</div>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: "20%", textAlign: "left" }}>GOALS</th>
                      <th style={thStyle}>1</th>
                      <th style={thStyle}>2</th>
                      <th style={thStyle}>3</th>
                      <th style={thStyle}>OT</th>
                      <th style={thStyle}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontSize: "9px", padding: "3px 4px", borderBottom: "1px solid #000", borderRight: "1px solid #000" }}>Home</td>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <td key={i} style={{ borderBottom: "1px solid #000", borderRight: i < 4 ? "1px solid #000" : undefined, height: "20px" }}>&nbsp;</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontSize: "9px", padding: "3px 4px", borderRight: "1px solid #000" }}>Away</td>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <td key={i} style={{ borderRight: i < 4 ? "1px solid #000" : undefined, height: "20px" }}>&nbsp;</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Shots Summary + Notes */}
              <td style={{ verticalAlign: "top", width: "36%", padding: "0 4px" }}>
                <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>Shots Summary</div>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: "20%", textAlign: "left" }}>SHOTS</th>
                      <th style={thStyle}>1</th>
                      <th style={thStyle}>2</th>
                      <th style={thStyle}>3</th>
                      <th style={thStyle}>OT</th>
                      <th style={thStyle}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontSize: "9px", padding: "3px 4px", borderBottom: "1px solid #000", borderRight: "1px solid #000" }}>Home</td>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <td key={i} style={{ borderBottom: "1px solid #000", borderRight: i < 4 ? "1px solid #000" : undefined, height: "20px" }}>&nbsp;</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontSize: "9px", padding: "3px 4px", borderRight: "1px solid #000" }}>Away</td>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <td key={i} style={{ borderRight: i < 4 ? "1px solid #000" : undefined, height: "20px" }}>&nbsp;</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Game Stars ── */}
        <div style={{ marginTop: "6px" }}>
          <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>Game Stars</div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
            <tbody>
              <tr>
                <td style={{ width: "33.3%", padding: "5px 8px", fontSize: "10px", borderRight: "1px solid #000", height: "24px" }}>
                  Star #1:
                </td>
                <td style={{ width: "33.3%", padding: "5px 8px", fontSize: "10px", borderRight: "1px solid #000", height: "24px" }}>
                  Star #2:
                </td>
                <td style={{ width: "33.4%", padding: "5px 8px", fontSize: "10px", height: "24px" }}>
                  Star #3:
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
