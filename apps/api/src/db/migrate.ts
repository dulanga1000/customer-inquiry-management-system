import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createPool } from "./pool.js";

const DEFAULT_MIGRATIONS_DIR = path.resolve(
  import.meta.dirname,
  "../../../../database/migrations",
);

export async function runMigrations(connectionString: string): Promise<void> {
  const migrationsDir = process.env.MIGRATIONS_DIR ?? DEFAULT_MIGRATIONS_DIR;
  const pool = createPool(connectionString);

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const entries = await fs.readdir(migrationsDir);
    const sqlFiles = entries.filter((file) => file.endsWith(".sql")).sort();

    for (const filename of sqlFiles) {
      const existing = await pool.query<{ filename: string }>(
        "SELECT filename FROM schema_migrations WHERE filename = $1",
        [filename],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, filename), "utf8");
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
        await client.query("COMMIT");
        process.stdout.write(`Applied migration: ${filename}\n`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename);

if (isDirectExecution) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    process.stderr.write("DATABASE_URL is required to run migrations.\n");
    process.exit(1);
  }
  runMigrations(databaseUrl).catch((error: unknown) => {
    process.stderr.write(`Migration failed: ${String(error)}\n`);
    process.exit(1);
  });
}
