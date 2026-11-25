import path from "node:path";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { Role } from "../src/generated/prisma/enums.js";
import { createPrismaContext } from "../src/lib/prisma.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

const BCRYPT_COST = 12;

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: Role;
}

const SEED_USERS: readonly SeedUser[] = [
  {
    email: "staff1@cims.local",
    name: "Staff One",
    password: "Password123!",
    role: Role.staff,
  },
  {
    email: "staff2@cims.local",
    name: "Staff Two",
    password: "Password123!",
    role: Role.staff,
  },
  {
    email: "admin@cims.local",
    name: "Admin User",
    password: "Password123!",
    role: Role.admin,
  },
];

async function main(): Promise<void> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run prisma/seed.ts");
  }

  const { prisma, disconnect } = createPrismaContext(databaseUrl);

  try {
    for (const user of SEED_USERS) {
      const passwordHash = await bcrypt.hash(user.password, BCRYPT_COST);
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          email: user.email,
          name: user.name,
          passwordHash,
          role: user.role,
        },
      });
    }
    process.stdout.write("Prisma seed completed idempotently.\n");
  } finally {
    await disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Prisma seed failed: ${String(error)}\n`);
  process.exit(1);
});
