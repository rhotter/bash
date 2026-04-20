import { db } from "./lib/db";
async function run() {
  const teams = await db.query.teams.findMany();
  console.log(teams.filter(t => t.slug.includes("tbd") || t.name.toLowerCase().includes("tbd")));
  process.exit(0);
}
run();
