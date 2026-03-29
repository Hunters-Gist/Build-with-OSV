import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7 resolves datasource URLs from prisma.config.ts.
    // Prefer DIRECT_URL for migration-safe direct connections.
    url: process.env["DIRECT_URL"] ?? env("DATABASE_URL"),
  },
});
