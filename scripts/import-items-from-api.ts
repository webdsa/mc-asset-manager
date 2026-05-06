/**
 * Importa itens de uma API externa para o Asset Manager.
 *
 * Variáveis de ambiente (ver também `.env` na raiz do projeto):
 * - DATABASE_URL (obrigatório)
 * - BLOB_READ_WRITE_TOKEN — opcional; sem ele, imagens vão para `public/uploads/assets/`
 * - IMPORT_SOURCE_BASE_URL — default `http://localhost:8080`
 * - IMPORT_CATEGORY_NAMES — categorias a importar, separadas por vírgula (default: `Decoração,Móveis`).
 *   Cada uma tem de existir na tabela Category (ex.: `npm run db:seed`).
 * - IMPORT_CATEGORY_NAME — se definido sozinho (sem IMPORT_CATEGORY_NAMES), importa só esta categoria (compatibilidade).
 * - IMPORT_PURCHASE_YEAR — inteiro; sem valor, usa o ano de `createdAt` da API ou o ano civil atual
 * - IMPORT_CONCURRENCY — pedidos GET paralelos por item (default 3)
 * - IMPORT_SKIP_EXISTING — `1`/`true`: não cria item se já existir `patrimonyCode` igual (quando o código vem da API)
 * - IMPORT_VERBOSE — `1`/`true`: regista a quantidade lida da API por item (útil para validar o mapeamento)
 * - IMPORT_ONLY_IDS — lista de ids da API separados por vírgula; só importa estes (útil para testes).
 *   Equivalente: `--only=id1,id2`
 *
 * Uso:
 *   npx tsx scripts/import-items-from-api.ts
 *   npx tsx scripts/import-items-from-api.ts --dry-run
 *   npx tsx scripts/import-items-from-api.ts --only=3Vzz9py6sa06awUpaJ7Q
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { PrismaClient } from "@/generated/prisma/client";
import { InsuranceStatus, ItemCondition } from "@/generated/prisma/client";
import { createPrismaDriverAdapter } from "@/lib/prisma-driver-adapter";
import { PRIVATE_ITEM_IMAGE_PREFIX } from "@/lib/item-image";
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

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

/** Inteiro ≥ 1 para o campo Prisma `Item.quantity`. */
function normalizeQuantity(qty: number): number {
  const n = Math.floor(Number(qty));
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return n;
}

/** Categorias a pedir à API e onde gravar no Asset Manager. */
function resolveImportCategoryNames(): string[] {
  const plural = process.env.IMPORT_CATEGORY_NAMES?.trim();
  if (plural) {
    return plural
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const single = process.env.IMPORT_CATEGORY_NAME?.trim();
  if (single) {
    return [single];
  }
  return ["Decoração", "Móveis"];
}

type ImportJob = {
  externalId: string;
  /** Categoria usada no pedido `?categoria=` quando o id veio da lista. */
  listCategoryName?: string;
};

function parseOnlyIdsFromArgvAndEnv(): string[] | null {
  const arg = process.argv.find((a) => a.startsWith("--only="));
  if (arg) {
    const list = arg
      .slice("--only=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : null;
  }
  const raw = process.env.IMPORT_ONLY_IDS?.trim();
  if (raw) {
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : null;
  }
  return null;
}

function purchaseYearFromApi(
  item: Record<string, unknown>,
  explicitYear: number | null,
): number {
  if (explicitYear != null && explicitYear >= 1900 && explicitYear <= 2100) {
    return explicitYear;
  }
  const created = str(item.createdAt);
  if (created) {
    const d = new Date(created);
    const y = d.getFullYear();
    if (Number.isFinite(y) && y >= 1900 && y <= 2100) {
      return y;
    }
  }
  return new Date().getFullYear();
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) {
    return null;
  }
  const mime = m[1].trim();
  const buffer = Buffer.from(m[2].replace(/\s/g, ""), "base64");
  return { mime, buffer };
}

function mimeToExt(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes("png")) {
    return ".png";
  }
  if (lower.includes("webp")) {
    return ".webp";
  }
  return ".jpg";
}

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

async function saveImportedImage(
  buffer: Buffer,
  mime: string,
  baseLabel: string,
): Promise<{ fileName: string; url: string }> {
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Imagem excede ${MAX_IMAGE_SIZE} bytes.`);
  }
  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    throw new Error(`Tipo de imagem não suportado: ${mime}`);
  }

  const ext = mimeToExt(mime);
  const safeLabel = baseLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const fileName = `${safeLabel || "imagem"}-${randomUUID()}${ext}`;

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const pathname = `item-images/${randomUUID()}${ext}`;
    const blob = await put(pathname, buffer, {
      access: "private",
      token,
      contentType: mime,
    });
    return {
      fileName,
      url: `${PRIVATE_ITEM_IMAGE_PREFIX}${blob.pathname}`,
    };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "assets");
  await mkdir(uploadDir, { recursive: true });
  const diskName = `${safeLabel || "imagem"}-${randomUUID()}${ext}`;
  const diskPath = path.join(uploadDir, diskName);
  await writeFile(diskPath, buffer);
  return {
    fileName,
    url: `/uploads/assets/${diskName}`,
  };
}

async function dataUrlToImage(
  dataUrl: string | null,
  altName: string,
  slot: number,
): Promise<{ fileName: string; url: string } | null> {
  if (!dataUrl) {
    return null;
  }
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    console.warn(`  URL de imagem inválida (slot ${slot}), ignorada.`);
    return null;
  }
  const label = `${altName}-foto${slot}`;
  return saveImportedImage(parsed.buffer, parsed.mime, label);
}

function resolveItemCategoryId(
  raw: Record<string, unknown>,
  categoryIdByName: Map<string, string>,
  listCategoryName: string | undefined,
): string {
  const apiCat = str(raw.categoria);
  if (apiCat && categoryIdByName.has(apiCat)) {
    return categoryIdByName.get(apiCat)!;
  }
  if (listCategoryName && categoryIdByName.has(listCategoryName)) {
    return categoryIdByName.get(listCategoryName)!;
  }
  if (categoryIdByName.size === 1) {
    return [...categoryIdByName.values()][0]!;
  }
  throw new Error(
    `Categoria não mapeada (API categoria=${apiCat ?? "∅"}, lista=${listCategoryName ?? "∅"}). Verifique IMPORT_CATEGORY_NAMES.`,
  );
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const base = envStr("IMPORT_SOURCE_BASE_URL", "http://localhost:8080").replace(/\/$/, "");
  const categoryNames = resolveImportCategoryNames();
  const concurrency = Math.max(1, Math.min(20, envInt("IMPORT_CONCURRENCY", 3)));
  const skipExisting = envBool("IMPORT_SKIP_EXISTING");
  const verbose = envBool("IMPORT_VERBOSE");

  const purchaseYearEnv = process.env.IMPORT_PURCHASE_YEAR?.trim();
  const explicitPurchaseYear =
    purchaseYearEnv && purchaseYearEnv.length > 0
      ? Math.floor(Number(purchaseYearEnv))
      : null;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Defina DATABASE_URL (ex.: copie .env.example para .env).");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: createPrismaDriverAdapter(connectionString),
  });

  const categoriesInDb = await prisma.category.findMany({
    where: { name: { in: categoryNames } },
    select: { id: true, name: true },
  });
  const categoryIdByName = new Map(categoriesInDb.map((c) => [c.name, c.id]));
  for (const n of categoryNames) {
    if (!categoryIdByName.has(n)) {
      console.error(
        `Categoria "${n}" não encontrada na base. Rode o seed (npm run db:seed) ou crie a categoria.`,
      );
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  const onlyIds = parseOnlyIdsFromArgvAndEnv();
  let jobs: ImportJob[];
  if (onlyIds) {
    jobs = onlyIds.map((externalId) => ({ externalId }));
    console.log(`Modo --only / IMPORT_ONLY_IDS: ${jobs.length} id(s), sem pedido à lista da API.`);
  } else {
    const seen = new Set<string>();
    jobs = [];
    for (const catName of categoryNames) {
      const listUrl = `${base}/api/items?idsOnly=true&categoria=${encodeURIComponent(catName)}`;
      console.log(`Listando IDs: ${listUrl}`);
      const listPayload = await fetchJson<{ ids?: string[] }>(listUrl, {
        signal: AbortSignal.timeout(180_000),
      });
      const idsRaw = listPayload.ids;
      if (!Array.isArray(idsRaw)) {
        console.warn(`Resposta sem array ids para categoria "${catName}".`);
        continue;
      }
      for (const id of idsRaw) {
        if (seen.has(id)) {
          continue;
        }
        seen.add(id);
        jobs.push({ externalId: id, listCategoryName: catName });
      }
    }
    if (jobs.length === 0) {
      console.log("Nenhum id retornado.");
      await prisma.$disconnect();
      return;
    }
  }

  console.log(
    `Categorias: ${categoryNames.join(", ")} — ${jobs.length} itens a processar (concorrência ${concurrency})${dryRun ? " [DRY-RUN]" : ""}.`,
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  async function processJob(job: ImportJob, index: number) {
    const { externalId, listCategoryName } = job;
    const label = `[${index + 1}/${jobs.length}] ${externalId}`;
    try {
      const detailUrl = `${base}/api/items/${encodeURIComponent(externalId)}`;
      const detail = await fetchJson<Record<string, unknown>>(detailUrl, {
        signal: AbortSignal.timeout(120_000),
      });
      const raw = mergeApiDetailPayload(detail);

      const name = str(raw.nome);
      if (!name) {
        throw new Error("Campo nome vazio");
      }

      const qtyParsed = quantityFromApi(raw);
      const qty = normalizeQuantity(qtyParsed);
      if (verbose) {
        const rawQ = raw.quantidade ?? raw.quantity ?? raw.qtde ?? raw.qtd;
        console.log(
          `${label} quantidade API=${rawQ === undefined ? "∅" : JSON.stringify(rawQ)} → ${qty}`,
        );
      }

      const itemCategoryId = resolveItemCategoryId(raw, categoryIdByName, listCategoryName);

      const patrimonyCode = patrimonyFromApi(raw);
      if (!dryRun && skipExisting && patrimonyCode) {
        const exists = await prisma.item.findFirst({
          where: { patrimonyCode },
          select: { id: true },
        });
        if (exists) {
          console.log(`${label} ignorado — patrimonyCode já existe.`);
          skipped += 1;
          return;
        }
      }

      const fotoMain = str(raw.foto);
      const foto2 =
        str(raw.foto2) ?? str(raw.foto_secundaria) ?? str(raw.fotoSecundaria);

      let images: { fileName: string; url: string; alt: string }[] = [];
      if (!dryRun) {
        const first = await dataUrlToImage(fotoMain, name, 1);
        const second = await dataUrlToImage(foto2, name, 2);
        images = [first, second]
          .filter((x): x is { fileName: string; url: string } => Boolean(x))
          .map((img) => ({ ...img, alt: name }));
      }

      const data = {
        name,
        description: null as string | null,
        categoryId: itemCategoryId,
        brand: str(raw.marca),
        model: str(raw.modelo),
        serialNumber: null as string | null,
        patrimonyCode,
        quantity: qty,
        location: null as string | null,
        purchaseYear: purchaseYearFromApi(raw, explicitPurchaseYear),
        purchaseDate: null as Date | null,
        purchaseValue: null,
        supplier: null as string | null,
        condition: ItemCondition.GOOD,
        insuranceStatus: InsuranceStatus.NOT_INSURED,
        insuranceCompany: null as string | null,
        insurancePolicy: null as string | null,
        insuranceExpires: null as Date | null,
        warrantyExpires: null as Date | null,
        notes: str(raw.observacao),
        invoiceFileName: null as string | null,
        invoiceFileUrl: null as string | null,
        images:
          images.length > 0
            ? {
                create: images.map((image) => ({
                  fileName: image.fileName,
                  url: image.url,
                  alt: image.alt,
                })),
              }
            : undefined,
      };

      if (dryRun) {
        console.log(
          `${label} OK (dry-run) — ${name} — cat=${str(raw.categoria) ?? listCategoryName ?? "?"} — qtd=${qty}${patrimonyCode ? ` — patrimônio ${patrimonyCode}` : ""}`,
        );
        created += 1;
        return;
      }

      const inserted = await prisma.item.create({
        data,
        select: { id: true, quantity: true },
      });
      if (inserted.quantity !== qty) {
        await prisma.item.update({
          where: { id: inserted.id },
          data: { quantity: qty },
        });
        console.warn(
          `${label} quantidade no INSERT era ${inserted.quantity}; atualizada para ${qty}.`,
        );
      }
      console.log(`${label} criado — ${name} — qtd=${qty}`);
      created += 1;
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
      if (i >= jobs.length) {
        return;
      }
      await processJob(jobs[i]!, i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker());
  await Promise.all(workers);

  console.log(`Concluído. criados=${created} ignorados=${skipped} falhas=${failed}`);

  await prisma.$disconnect();
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
