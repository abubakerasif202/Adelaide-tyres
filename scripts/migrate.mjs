#!/usr/bin/env node
// Applies migrations/*.sql, in filename order, against DATABASE_URL or
// POSTGRES_URL. Run once after provisioning the database, and again after
// adding a new numbered migration file. Safe to re-run: every statement here
// uses IF NOT EXISTS / idempotent DDL.
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("Set DATABASE_URL (or POSTGRES_URL) before running migrations.");
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, max: 1 });
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  console.log(`Applying ${file}...`);
  const text = readFileSync(join(dir, file), "utf8");
  await sql.unsafe(text);
}

console.log(`Applied ${files.length} migration file(s).`);
await sql.end();
