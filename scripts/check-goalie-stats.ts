import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL as string);

async function main() {
  const bad = await sql`
    SELECT player_id, game_id, saves, shots_against, goals_against, minutes
    FROM goalie_game_stats
    WHERE saves > shots_against AND shots_against > 0
    ORDER BY saves DESC
    LIMIT 10
  `;
  console.log("Games where saves > shots_against:");
  console.table(bad);

  const mismatch = await sql`
    SELECT player_id, game_id, saves, shots_against, goals_against, minutes,
           (saves + goals_against) as expected_shots
    FROM goalie_game_stats
    WHERE shots_against > 0 AND shots_against != (saves + goals_against)
    ORDER BY ABS(shots_against - (saves + goals_against)) DESC
    LIMIT 10
  `;
  console.log("\nGames where shots_against != saves + goals_against:");
  console.table(mismatch);

  // Check what a typical row looks like
  const sample = await sql`
    SELECT p.name, ggs.*
    FROM goalie_game_stats ggs
    JOIN players p ON p.id = ggs.player_id
    WHERE ggs.shots_against > 0
    ORDER BY ggs.game_id DESC
    LIMIT 5
  `;
  console.log("\nSample recent goalie stats:");
  console.table(sample);
}
main().catch(console.error);
