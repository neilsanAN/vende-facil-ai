import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const child = spawn(
  "corepack",
  ["pnpm", "exec", "prisma", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "packages/database/prisma/schema.prisma", "--script"],
  { shell: true, cwd: process.cwd() },
);
let output = "";
let error = "";
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  error += chunk.toString();
});
child.on("close", (code) => {
  const sql = output.replace(/^\uFEFF/, "").trimStart();
  if (code !== 0 || !sql.startsWith("--")) {
    console.error(error || output.slice(0, 400));
    process.exit(code || 1);
  }
  mkdirSync("packages/database/prisma/migrations/0001_init", { recursive: true });
  writeFileSync("packages/database/prisma/migrations/0001_init/migration.sql", `${sql}\n`);
  writeFileSync("packages/database/prisma/migrations/migration_lock.toml", 'provider = "postgresql"\n');
  console.log(`migration bytes ${sql.length}`);
});
