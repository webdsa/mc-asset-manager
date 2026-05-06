import type { PrismaClient } from "@/generated/prisma/client";

/** Itens visíveis no inventário vs. só soft-deleted (`hiddenAt` preenchido). */
export type PatrimonyItemVisibility = "visible" | "hidden";

/** IDs com `patrimonyCode` ou `qrCode` contendo o texto (ILIKE); SQL para estes campos. */
export async function itemIdsMatchingPatrimonyCode(
  prisma: PrismaClient,
  textQuery: string,
  visibility: PatrimonyItemVisibility = "visible",
): Promise<string[]> {
  const q = textQuery.trim();
  if (!q) {
    return [];
  }
  const pattern = `%${q}%`;
  const rows =
    visibility === "hidden"
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Item"
          WHERE "hiddenAt" IS NOT NULL
            AND (
              ("patrimonyCode" IS NOT NULL AND "patrimonyCode" ILIKE ${pattern})
              OR ("qrCode" IS NOT NULL AND "qrCode" ILIKE ${pattern})
            )
        `
      : await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Item"
          WHERE "hiddenAt" IS NULL
            AND (
              ("patrimonyCode" IS NOT NULL AND "patrimonyCode" ILIKE ${pattern})
              OR ("qrCode" IS NOT NULL AND "qrCode" ILIKE ${pattern})
            )
        `;
  return rows.map((r) => r.id);
}
