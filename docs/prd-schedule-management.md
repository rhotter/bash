# Schedule Management PRD & Implementation Plan

## Goal Description
The objective is to build a robust Schedule Management module for the BASH Admin Dashboard to replace the legacy Sportability interface. This module will allow admins to view, filter, edit, and manage games for the current/active season. It will mirror the functionality provided by Sportability (game types, scores, special flags, and summaries) while modernizing the UI/UX and optimizing the underlying data model.

## Functionality Analysis: Sportability vs BASH

Based on the provided screenshots, the Sportability schedule system includes three major features:

### 1. Manual Schedule Management
*   **Schedule List View**: A table displaying Date, Time, Away, Home, Location, and Type. Includes filtering by Team or Location.
*   **Add/Edit Game Form**: Date, Time, Away Team, Home Team, Location, Game Type, Reschedule/Cancel Options, Special Flags, and Summaries. An "Add Game" view provides a blank state of the edit form.

### 2. Round Robin Wizard
A robust 6-step generator that builds a full season schedule mathematically:
*   **Step 1 (Parameters)**: Games per Week (handles odd teams by assigning byes vs double-headers) and Schedule Length (run for X cycles or approx X games per team).
*   **Step 2 (Start Date)**: Sets the start date and week range (Sun-Sat vs Mon-Sun). It generates a generic slot-based round robin pairing (e.g., Team 1 vs Team 4).
*   **Step 3 (Skipping Weeks)**: Allows admins to exclude specific weeks (e.g., holidays). The wizard pushes all subsequent games out automatically.
*   **Step 4 (Times and Locations)**: Sets a default Day, Time, and Location for each generic slot across all weeks.
*   **Step 5 (Game Types)**: Allows setting an entire week as Practice or Exhibition (won't count in standings).
*   **Step 6 (Save)**: Displays the finalized schedule with actual dates/times, and allows either overwriting the entire existing schedule or appending to it. Team numbers are replaced with real team names when the games are persisted.

### 3. Playoff Bracket Wizard
A robust 4-step generator to build a playoff bracket with configurable series formats, automatic bracket progression, and optional play-in games.

#### BASH Playoff Formats

BASH has two primary playoff formats that vary by season:

| | Fall Season (5 teams) | Summer Season (4 teams) |
|---|---|---|
| Play-in | #4 vs #5, single game | N/A |
| Semi-finals | Best-of-3 series | Single game |
| Finals | Best-of-3 series | Single game |
| Scheduling | Multi-week (play-in Sunday, semis Sat+Sun) | Single day (all games back-to-back) |

These are the typical configurations, but the wizard should support full customization:
*   **Play-in game**: Optional. Only applicable when number of teams exceeds bracket slots (e.g., 5 teams in a 4-team bracket).
*   **Series length per round**: 1-game (single elimination) or 3-game (best-of-3). Configurable independently for semi-finals and finals.
*   **Auto-advancement**: When a series is decided (team wins ⌈seriesLength/2⌉ games), the winner is pushed to the downstream round. For best-of-3, this means winning 2 games.

#### Wizard Steps

*   **Step 1 (Format & Teams)**: Select the number of teams. Toggle play-in game on/off. Choose series length for semi-finals (1 or 3) and finals (1 or 3). Choose to auto-seed using standings or use manual placeholders (e.g. #1 Seed). Placeholders allow admins to build and save the bracket early in the season before final standings are known, then revisit later to assign real teams.
*   **Step 2 (Assign Matchups)**: Shows a visual bracket tree. Seeds are auto-assigned (1 vs play-in winner, 2 vs 3 — or 1 vs 4, 2 vs 3 without play-in). Admins can adjust dropdowns. For best-of-3 rounds, the bracket shows "Series A" / "Series B" labels.
*   **Step 3 (Enter Game Details)**: Assign Dates, Times, and Locations to all games in the bracket. For best-of-3 series, all potential games (1, 2, 3) are scheduled upfront — Game 3 can be cancelled later if unnecessary (2-0 sweep). Later round games show opponents as "Winner SF-A" etc.
*   **Step 4 (Review & Save)**: Generates a final list preview and the visual bracket. An in-app `AlertDialog` (replacing the legacy browser alert) confirms overwriting any existing playoff tournament. Saving automatically tags all generated games with `gameType = "playoff"`.

---

## Decisions Made

The following decisions have been finalized after design review:

1.  **Placeholder Architecture → Option A (Clean Schema).** We will update the database schema (adding `homePlaceholder`/`awayPlaceholder` columns) rather than creating dummy teams in the `teams` table. This replaces the previous `seed-1`, `seed-2` auto-generation logic which has been removed from the season creation API. The `teams` table will contain only real teams going forward.

2.  **Round Robin Wizard → Sportability-style placeholders.** The wizard will use generic "Team 1 vs Team 4" placeholders throughout generation, assigning real team names only at save time (Step 6). This mirrors Sportability's approach and allows admins to build a schedule before team rosters/assignments are finalized.

3.  **Playoff Wizard → Support early bracket creation.** Admins can save a bracket with placeholder team names (e.g., "Seed 1", "Seed 2") early in the season. They can revisit the bracket later to replace placeholders with real teams once standings are finalized.

4.  **Playoff Series → Configurable series length.** The wizard supports both single-game elimination and best-of-3 series, configurable per round (semi-finals and finals independently). Play-in games are always single-game. For best-of-3 series, all potential games are pre-scheduled. Auto-advancement triggers when a team clinches the series (wins 2 games).

---

## Current BASH Data Model (`games` table)

Currently, we store: `id`, `seasonId`, `date`, `time`, `homeTeam`, `awayTeam`, `homeScore`, `awayScore`, `status` (upcoming/completed), `isOvertime`, `isPlayoff`, `isForfeit`, `location`, `hasBoxscore`, and a single `notes` string.

Key constraints:
*   `homeTeam` and `awayTeam` are `NOT NULL` with foreign keys to `teams.slug`.
*   `isPlayoff` is a boolean on both `games` and `playerSeasonStats` (where it is part of the **composite primary key**).
*   The `games` table is referenced by `playerGameStats`, `goalieGameStats`, `gameOfficials`, and `gameLive` — none of which have cascade deletes.

## Proposed Data Model Updates

All changes are **additive** — no existing columns are modified or removed, and no existing queries need to change.

1.  **Add `gameType` (text, default `"regular"`)**
    *   Admin/display label: "regular", "playoff", "practice", "exhibition", "championship", "jamboree".
    *   **`isPlayoff` stays permanently.** It is the correct abstraction for the stats system, which only ever asks a binary question: "is this a playoff game or not?" All 60+ existing consumer queries (`fetch-player-detail.ts`, `fetch-player-stats.ts`, `computeStandings()`, etc.) continue to use `isPlayoff` unchanged. Zero stats queries need to change, zero latency impact, zero risk to the `playerSeasonStats` composite primary key.
    *   The relationship is enforced at the API layer: when `gameType = "playoff"`, set `isPlayoff = true`. For all other types, `isPlayoff = false`.
    *   A one-time backfill sets `gameType = "playoff"` for existing rows where `isPlayoff = true`.

2.  **Add `hasShootout` (boolean, default `false`)**

3.  **Add `awayNotes` and `homeNotes` (text, nullable)**

4.  **Add `homePlaceholder` and `awayPlaceholder` (text, nullable)**
    *   Display-only text for unresolved teams (e.g., "Seed 1", "Winner #2").
    *   `homeTeam`/`awayTeam` remain `NOT NULL`. For games with unresolved teams, they will reference a sentinel `"tbd"` team slug (which already exists in our system and is filtered out of standings by `computeStandings()`).

5.  **Add `nextGameId` (text, nullable, self-referential FK)**
    *   Links playoff games in a bracket tree. When a game is completed, the winner is pushed to the downstream game.

6.  **Add `nextGameSlot` (text, nullable)**
    *   Values: `"home"` or `"away"`. Indicates which slot of the `nextGameId` game the winner of this game feeds into.

7.  **Add `bracketRound` (text, nullable)**
    *   Identifies the playoff round: `"play-in"`, `"semifinal"`, `"final"`. Used for display grouping and series advancement logic.

8.  **Add `seriesId` (text, nullable)**
    *   Groups games belonging to the same matchup/series (e.g., `"sf-a"`, `"sf-b"`, `"final"`, `"play-in"`). For single-game rounds, the series has one game. For best-of-3, it has up to three.

9.  **Add `seriesGameNumber` (integer, nullable)**
    *   Which game within the series: 1, 2, or 3. Used for display ("Game 1 of 3") and to determine series clinch.

> [!TIP]
> We don't need Sportability's "New Date" and "New Location" fields. If a game is rescheduled, the admin simply changes the *actual* Date and Time fields.

---

## Proposed Changes

### 1. Database Schema (`lib/db/schema.ts`)

#### Games table additions:
```
gameType:         text("game_type").notNull().default("regular")
hasShootout:      boolean("has_shootout").notNull().default(false)
awayNotes:        text("away_notes")
homeNotes:        text("home_notes")
homePlaceholder:  text("home_placeholder")
awayPlaceholder:  text("away_placeholder")
nextGameId:         text("next_game_id")       // self-referential FK to games.id
nextGameSlot:       text("next_game_slot")     // "home" | "away"
bracketRound:       text("bracket_round")      // "play-in" | "semifinal" | "final"
seriesId:           text("series_id")          // groups games in same matchup/series
seriesGameNumber:   integer("series_game_number") // 1, 2, or 3 within a series
```

#### Cleanup:
*   Remove the `seed-1`, `seed-2`, etc. auto-generation logic from season creation (already done).
*   Clean up any existing `seed-*` team records from the `teams` and `season_teams` tables via a one-time migration script.
*   Ensure a `"tbd"` team slug exists in the `teams` table as a sentinel for unresolved playoff matchups.

#### Backfill migration:
```sql
UPDATE games SET game_type = 'playoff' WHERE is_playoff = true;
UPDATE games SET game_type = 'regular' WHERE is_playoff = false;
```

### 2. API Routes

*   **[NEW]** `GET /api/bash/admin/seasons/[id]/schedule` — Fetch all games for the season, joined with team names. Returns `homePlaceholder`/`awayPlaceholder` for display when `homeTeam = "tbd"`.
*   **[NEW]** `POST /api/bash/admin/seasons/[id]/schedule` — Create a single game (the "Add Game" form).
*   **[NEW]** `PATCH /api/bash/admin/seasons/[id]/schedule/[gameId]` — Update a game. For playoff games with a `seriesId`, checks if completing this game clinches the series (team wins ⌈seriesLength/2⌉ games in the series). If the series is decided and the game has a `nextGameId`, automatically advances the series winner to the downstream game's `homeTeam` or `awayTeam` (based on `nextGameSlot`).
*   **[NEW]** `DELETE /api/bash/admin/seasons/[id]/schedule/[gameId]` — Delete a game. Must first delete child records from `playerGameStats`, `goalieGameStats`, `gameOfficials`, and `gameLive` (no cascade defined). Should refuse deletion if the game has `status = "final"` with boxscore data, unless force-confirmed.
*   **[NEW]** `POST /api/bash/admin/seasons/[id]/schedule/generate` — Bulk insert for the Round Robin Wizard. Supports two modes:
    *   **Overwrite**: Deletes existing games (only those with `status != "final"` unless force-confirmed) and inserts the new schedule.
    *   **Append**: Inserts new games alongside existing ones.
    *   Generated game IDs should use a `gen-` prefix to avoid collision with Sportability-synced numeric IDs.
*   **[NEW]** `POST /api/bash/admin/seasons/[id]/schedule/playoffs` — Bulk insert for the Playoff Wizard. Creates linked games with `nextGameId`/`nextGameSlot`/`seriesId`/`bracketRound` references. Supports configurable series length per round (1 or 3) and optional play-in game. For best-of-3 rounds, generates all potential games (1, 2, 3). Overwrites any existing playoff games for the season (after confirmation).

### 3. Frontend Components

*   **`components/admin/season-schedule-tab.tsx`** — List View with "Add Game" button and "Generate Schedule" / "Playoff Bracket" wizard launchers.
    *   Filter by Team and Filter by Location dropdowns.
    *   Table columns: Date, Time, Away, Home, Location, Type, Status.
    *   Games with `homeTeam = "tbd"` display the `homePlaceholder` text instead.
*   **`components/admin/edit-game-modal.tsx`** — Reusable form for Adding/Editing games.
    *   Two-column layout for Away Team (Select + Score) vs Home Team (Select + Score).
    *   Dropdowns for Game Type and Status.
    *   Toggles for Overtime, Shootout, and Forfeit.
    *   Tabbed notes area (League Summary | Away Notes | Home Notes).
*   **`components/admin/round-robin-wizard.tsx`** — 6-step round robin generator.
    *   Uses a Berger tables algorithm in the browser to generate pairings.
    *   Manages state internally; sends final payload to server at save.
*   **`components/admin/playoff-wizard.tsx`** — 4-step bracket generator with visual tree.
    *   Supports both auto-seeded (from standings) and placeholder modes.
    *   Visual bracket rendered via CSS/SVG for the review step.

### 4. Public Site (deferred)

Public-facing bracket display is **out of scope** for this PR. It will be addressed in a follow-up once the admin tooling and data model are stable.

---

## Verification Plan

### Automated Tests
*   `npx tsc --noEmit` — Type safety after all schema and consumer changes.
*   `npm run db:push` — Apply schema updates locally.
*   Regression test for `computeStandings()` — Verify standings computation still works correctly with games that have `homeTeam = "tbd"` (they should be filtered out, as they already are).
*   Backfill test — Verify `gameType` is correctly populated from `isPlayoff` on existing data.

### Manual Verification
*   Filter schedule by Team → only shows games where team is Home OR Away.
*   Update a game from "upcoming" to "completed" → saves scores and notes.
*   Edit an existing game → updates row without creating a duplicate.
*   Complete a playoff game with `nextGameId` → verify the downstream game's team slot is automatically updated.
*   Delete a game that has child records → verify clean deletion with no orphans.
*   Run the Round Robin Wizard in overwrite mode on a season with completed games → verify warning/refusal.
*   Save a playoff bracket with placeholder teams → verify `"tbd"` sentinel is used and placeholders display correctly.
