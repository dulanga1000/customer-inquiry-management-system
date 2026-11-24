import "dotenv/config";
import path from "node:path";
import bcrypt from "bcrypt";
import type { UserRole } from "@cims/shared";
import { createPool } from "./pool.js";

const BCRYPT_COST = 12;

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

const SEED_USERS: readonly SeedUser[] = [
  {
    email: "staff1@cims.local",
    name: "Staff One",
    password: "Password123!",
    role: "staff",
  },
  {
    email: "staff2@cims.local",
    name: "Staff Two",
    password: "Password123!",
    role: "staff",
  },
  {
    email: "admin@cims.local",
    name: "Admin User",
    password: "Password123!",
    role: "admin",
  },
];

export async function runSeed(connectionString: string): Promise<void> {
  const pool = createPool(connectionString);

  try {
    for (const user of SEED_USERS) {
      const passwordHash = await bcrypt.hash(user.password, BCRYPT_COST);
      await pool.query(
        `
          INSERT INTO users (email, name, password_hash, role)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (email) DO NOTHING
        `,
        [user.email, user.name, passwordHash, user.role],
      );
    }
    process.stdout.write("Seed completed idempotently.\n");
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
    process.stderr.write("DATABASE_URL is required to run seeds.\n");
    process.exit(1);
  }
  runSeed(databaseUrl).catch((error: unknown) => {
    process.stderr.write(`Seed failed: ${String(error)}\n`);
    process.exit(1);
  });
}
