import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import type { SqlDriverAdapterFactory } from "@prisma/driver-adapter-utils";

function isNeonHost(connectionString: string): boolean {
  try {
    const host = new URL(
      connectionString.replace(/^postgresql:/i, "http:"),
    ).hostname;
    return host.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

/** Runtime: Neon → driver serverless; local/Docker → `pg`. */
export function createPrismaDriverAdapter(
  connectionString: string,
): SqlDriverAdapterFactory {
  if (isNeonHost(connectionString)) {
    return new PrismaNeon({ connectionString });
  }
  return new PrismaPg({ connectionString });
}
