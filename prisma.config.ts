import "dotenv/config";
import { defineConfig } from "prisma/config";
import { migrationDatabaseUrl } from "./prisma/env-url";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationDatabaseUrl(),
  },
});
