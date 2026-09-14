// Creates (or reuses) a disposable LOCAL Postgres database for the order store
// and applies migrations/*.sql in order. Loopback only: it refuses any other
// host so it can never touch a hosted database.
//
//   node scripts/prepare-local-order-db.mjs [--database awt_hardening_rehearsal] [--upto 002] [--fresh]
//
// Prints the DATABASE_URL to use for tests/cross-system on stdout.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i === -1 ? fallback : args[i + 1]; };
const database = option("database", "awt_hardening_rehearsal");
const upto = option("upto", null);
const fresh = args.includes("--fresh");
const admin = new URL(process.env.LOCAL_PG_ADMIN_URL ?? "postgres://postgres:postgres@127.0.0.1:55332/postgres");
if (!["127.0.0.1", "localhost"].includes(admin.hostname)) throw new Error("LOCAL_PG_ADMIN_URL must be a loopback address");
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(database)) throw new Error("invalid database name");

export const MIGRATIONS_DIR = new URL("../migrations/", import.meta.url);

export function migrationFiles(dir = MIGRATIONS_DIR) {
  return readdirSync(dir).filter((name) => /^\d{3}_.*\.sql$/.test(name)).sort();
}

export async function prepareLocalOrderDatabase({ adminUrl = admin.href, name = database, uptoPrefix = upto, recreate = fresh } = {}) {
  const root = postgres(adminUrl, { max: 1 });
  try {
    if (recreate) await root.unsafe(`drop database if exists ${name} with (force)`);
    const exists = await root`select 1 from pg_database where datname = ${name}`;
    if (!exists.length) await root.unsafe(`create database ${name}`);
  } finally { await root.end(); }
  const target = new URL(adminUrl); target.pathname = `/${name}`;
  const sql = postgres(target.href, { max: 1 });
  try {
    await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const applied = new Set((await sql`select name from schema_migrations`).map((row) => row.name));
    for (const file of migrationFiles()) {
      if (uptoPrefix && file.slice(0, 3) > uptoPrefix) break;
      if (applied.has(file)) continue;
      await sql.begin(async (tx) => {
        await tx.unsafe(readFileSync(join(MIGRATIONS_DIR.pathname.replace(/^\/([A-Za-z]:)/, "$1"), file), "utf8"));
        await tx`insert into schema_migrations (name) values (${file})`;
      });
      process.stderr.write(`[prepare-local-order-db] applied ${file} to ${name}\n`);
    }
  } finally { await sql.end(); }
  return target.href;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").replace(/^.*\//, ""))) {
  const url = await prepareLocalOrderDatabase();
  process.stdout.write(`${url}\n`);
}
