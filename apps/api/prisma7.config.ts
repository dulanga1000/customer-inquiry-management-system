import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load root monorepo .env first, then allow local overrides if present
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
