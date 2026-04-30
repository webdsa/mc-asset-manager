import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaDriverAdapter } from "@/lib/prisma-driver-adapter";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL não está definido. Copie .env.example para .env e configure a URL do PostgreSQL.",
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createPrismaDriverAdapter(connectionString),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
