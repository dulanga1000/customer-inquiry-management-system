import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";

export type PrismaClientInstance = PrismaClient;

export interface PrismaContext {
  prisma: PrismaClient;
  pool: Pool;
  disconnect: () => Promise<void>;
}

export function createPrismaContext(connectionString: string): PrismaContext {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return {
    prisma,
    pool,
    disconnect: async () => {
      await prisma.$disconnect();
      await pool.end();
    },
  };
}

let singletonContext: PrismaContext | undefined;

export function getPrismaContext(connectionString?: string): PrismaContext {
  if (!singletonContext) {
    const url = connectionString ?? process.env["DATABASE_URL"];
    if (!url) {
      throw new Error("DATABASE_URL is required to initialize PrismaClient");
    }
    singletonContext = createPrismaContext(url);
  }
  return singletonContext;
}

export function getPrisma(connectionString?: string): PrismaClient {
  return getPrismaContext(connectionString).prisma;
}
