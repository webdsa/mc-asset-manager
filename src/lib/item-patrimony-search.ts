import type { PrismaClient } from "@/generated/prisma/client";

/** IDs com `patrimonyCode` contendo o texto (ILIKE); usa SQL para não depender do filtro Prisma neste campo. */
export async function itemIdsMatchingPatrimonyCode(
  prisma: PrismaClient,
  textQuery: string,
): Promise<string[]> {
  const q = textQuery.trim();
  if (!q) {
    return [];
  }
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Item"
    WHERE "patrimonyCode" IS NOT NULL
      AND "patrimonyCode" ILIKE ${`%${q}%`}
  `;
  return rows.map((r) => r.id);
}
