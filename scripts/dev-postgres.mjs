import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const databaseDir = path.resolve(".local/pg");
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "vendefacil",
  password: "vendefacil",
  port: 5432,
  persistent: true,
});

if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("vendefacil");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/already exists/i.test(message)) throw error;
}
console.log("postgres ready on localhost:5432");
setInterval(() => {}, 60_000);
