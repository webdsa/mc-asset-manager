/**
 * Atualiza `Item.quantity` na base a partir das quantidades da API externa (mesma do import).
 *
 * Critério de correspondência (por ordem):
 * 1. Notas contêm `[import-source-id:ID_DA_API]` (opcional; pode ser adicionado ao import no futuro)
 * 2. `patrimonyCode` igual ao código de património devolvido pela API (ambos não vazios)
 * 3. `name` igual a `nome` da API **e** só existe **um** item nessa categoria com esse nome
 *
 * Variáveis de ambiente: as mesmas do import (`DATABASE_URL`, `IMPORT_SOURCE_BASE_URL`, `IMPORT_CATEGORY_NAME`,
 * `IMPORT_CONCURRENCY`, `IMPORT_VERBOSE`).
 *
 * Por defeito corre em modo simulação (não grava). Para aplicar:
 *   npx tsx scripts/sync-quantities-from-api.ts --apply
 */

import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaDriverAdapter } from "@/lib/prisma-driver-adapter";
import {
  envStr,
  envInt,
  envBool,
  str,
  patrimonyFromApi,
  quantityFromApi,
  fetchJson,
  mergeApiDetailPayload,
} from "./lib/external-api-shared";

function normalizeName(name: string): string {
  return name.trim().normalize("NFC").replace(/\s+/g, " ");
}

function importSourceMarker(externalId: string): string {
  return `[import-source-id:${externalId}]`;
}

type MatchResult =
  | { status: "found"; item: { id: string; quantity: number; name: string } }
  | { status: "ambiguous"; count: number }
  | { status: "none" };

async function findDbItemForApiItem(
  prisma: PrismaClient,
  categoryId: string,
  externalId: string,
  apiNome: string,
  apiPatrimony: string | null,
): Promise<MatchResult> {
  const marker = importSourceMarker(externalId);
  const byNotes = await prisma.item.findFirst({
    where: {
      categoryId,
      notes: { contains: marker },
    },
    select: { id: true, quantity: true, name: true },
  });
  if (byNotes) {
    return { status: "found", item: byNotes };
  }

  if (apiPatrimony) {
    const byPat = await prisma.item.findUnique({
      where: { patrimonyCode: apiPatrimony },
      select: { id: true, quantity: true, name: true, categoryId: true },
    });
    if (byPat && byPat.categoryId === categoryId) {
      return {
        status: "found",
        item: { id: byPat.id, quantity: byPat.quantity, name: byPat.name },
      };
    }
  }

  const normalizedApiName = normalizeName(apiNome);
  const candidates = await prisma.item.findMany({
    where: { categoryId },
    select: { id: true, quantity: true, name: true },
  });
  const matches = candidates.filter((c) => normalizeName(c.name) === normalizedApiName);
  if (matches.length === 1) {
    return { status: "found", item: matches[0]! };
  }
  if (matches.length > 1) {
    return { status: "ambiguous", count: matches.length };
  }
  return { status: "none" };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const base = envStr("IMPORT_SOURCE_BASE_URL", "http://localhost:8080").replace(/\/$/, "");
  const categoryName = envStr("IMPORT_CATEGORY_NAME", "Decoração");
  const concurrency = Math.max(1, Math.min(20, envInt("IMPORT_CONCURRENCY", 3)));
  const verbose = envBool("IMPORT_VERBOSE");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Defina DATABASE_URL.");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: createPrismaDriverAdapter(connectionString),
  });

  const category = await prisma.category.findFirst({
    where: { name: categoryName },
  });
  if (!category) {
    console.error(`Categoria "${categoryName}" não encontrada.`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const categoryId = category.id;

  const listUrl = `${base}/api/items?idsOnly=true&categoria=${encodeURIComponent(categoryName)}`;
  console.log(`Listando IDs: ${listUrl}`);
  const listPayload = await fetchJson<{ ids?: string[] }>(listUrl, {
    signal: AbortSignal.timeout(180_000),
  });
  const idsRaw = listPayload.ids;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    console.log("Nenhum id retornado.");
    await prisma.$disconnect();
    return;
  }
  const ids: string[] = idsRaw;

  console.log(
    `${ids.length} itens na API (concorrência ${concurrency}). Modo: ${apply ? "APLICAR" : "simulação (use --apply para gravar)"}.`,
  );

  let updated = 0;
  let unchanged = 0;
  let ambiguous = 0;
  let notFound = 0;
  let failed = 0;

  async function processOne(externalId: string, index: number) {
    const label = `[${index + 1}/${ids.length}] ${externalId}`;
    try {
      const detailUrl = `${base}/api/items/${encodeURIComponent(externalId)}`;
      const detail = await fetchJson<Record<string, unknown>>(detailUrl, {
        signal: AbortSignal.timeout(120_000),
      });
      const raw = mergeApiDetailPayload(detail);

      const apiNome = str(raw.nome);
      if (!apiNome) {
        throw new Error("API sem nome");
      }

      const qty = quantityFromApi(raw);
      const apiPatrimony = patrimonyFromApi(raw);

      const resolved = await findDbItemForApiItem(
        prisma,
        categoryId,
        externalId,
        apiNome,
        apiPatrimony,
      );

      if (resolved.status === "ambiguous") {
        console.warn(
          `${label} ambíguo: ${resolved.count} itens com o nome "${apiNome}" nesta categoria.`,
        );
        ambiguous += 1;
        return;
      }

      if (resolved.status === "none") {
        console.warn(`${label} sem correspondência na base — ${apiNome}`);
        notFound += 1;
        return;
      }

      const match = resolved.item;

      if (match.quantity === qty) {
        if (verbose) {
          console.log(`${label} sem alterações — qtd=${qty}`);
        }
        unchanged += 1;
        return;
      }

      console.log(
        `${label} "${match.name}" — ${match.quantity} → ${qty}${apply ? "" : " (simulação)"}`,
      );

      if (apply) {
        await prisma.item.update({
          where: { id: match.id },
          data: { quantity: qty },
        });
      }
      updated += 1;
    } catch (e) {
      failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${label} ERRO: ${msg}`);
    }
  }

  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= ids.length) {
        return;
      }
      await processOne(ids[i]!, i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, () => worker()));

  console.log(
    `Concluído. atualizados=${updated} sem mudança=${unchanged} ambíguos=${ambiguous} sem match=${notFound} falhas=${failed}`,
  );

  await prisma.$disconnect();
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
