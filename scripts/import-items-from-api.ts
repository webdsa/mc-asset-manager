/**
 * Importa itens de uma API externa para o Asset Manager.
 *
 * Variáveis de ambiente (ver também `.env` na raiz do projeto):
 * - DATABASE_URL (obrigatório)
 * - BLOB_READ_WRITE_TOKEN — opcional; sem ele, imagens vão para `public/uploads/assets/`
 * - IMPORT_SOURCE_BASE_URL — default `http://localhost:8080`
 * - IMPORT_CATEGORY_NAME — default `Decoração` (tem de existir na tabela Category; rode `npm run db:seed` se precisar)
 * - IMPORT_PURCHASE_YEAR — inteiro; sem valor, usa o ano de `createdAt` da API ou o ano civil atual
 * - IMPORT_CONCURRENCY — pedidos GET paralelos por item (default 3)
 * - IMPORT_SKIP_EXISTING — `1`/`true`: não cria item se já existir `patrimonyCode` igual (quando o código vem da API)
 *
 * Uso:
 *   npx tsx scripts/import-items-from-api.ts
 *   npx tsx scripts/import-items-from-api.ts --dry-run
 */

import { existsSync, readFileSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { PrismaClient } from "@/generated/prisma/client";
import { InsuranceStatus, ItemCondition } from "@/generated/prisma/client";
import { createPrismaDriverAdapter } from "@/lib/prisma-driver-adapter";
import { PRIVATE_ITEM_IMAGE_PREFIX } from "@/lib/item-image";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

function loadEnvFromDotenvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFromDotenvFile();

function envStr(key: string, fallback: string): string {
  const v = process.env[key]?.trim();
  return v && v.length > 0 ? v : fallback;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return fallback;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function envBool(key: string): boolean {
  const v = process.env[key]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function str(v: unknown): string | null {
  if (typeof v !== "string") {
    return null;
  }
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function patrimonyFromApi(item: Record<string, unknown>): string | null {
  const keys = [
    "codigoPatrimonio",
    "codigo_patrimonio",
    "patrimonyCode",
    "patrimonio",
  ];
  for (const k of keys) {
    const s = str(item[k]);
    if (s) {
      return s;
    }
  }
  return null;
}

function quantityFromApi(item: Record<string, unknown>): number {
  const q = item.quantidade;
  if (typeof q === "number" && Number.isFinite(q)) {
    const n = Math.floor(q);
    return n >= 1 ? n : 1;
  }
  if (typeof q === "string") {
    const n = Math.floor(Number(q.replace(",", ".")));
    return Number.isFinite(n) && n >= 1 ? n : 1;
  }
  return 1;
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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}${body ? `\n${body.slice(0, 500)}` : ""}`);
  }
  return res.json() as Promise<T>;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const base = envStr("IMPORT_SOURCE_BASE_URL", "http://localhost:8080").replace(/\/$/, "");
  const categoryName = envStr("IMPORT_CATEGORY_NAME", "Móveis");
  const concurrency = Math.max(1, Math.min(20, envInt("IMPORT_CONCURRENCY", 3)));
  const skipExisting = envBool("IMPORT_SKIP_EXISTING");

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

  const category = await prisma.category.findFirst({
    where: { name: categoryName },
  });
  if (!category) {
    console.error(
      `Categoria "${categoryName}" não encontrada. Rode o seed (npm run db:seed) ou crie a categoria.`,
    );
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

  console.log(`${ids.length} itens a processar (concorrência ${concurrency})${dryRun ? " [DRY-RUN]" : ""}.`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  async function processId(externalId: string, index: number) {
    const label = `[${index + 1}/${ids.length}] ${externalId}`;
    try {
      const detailUrl = `${base}/api/items/${encodeURIComponent(externalId)}`;
      const detail = await fetchJson<{ item?: Record<string, unknown> }>(detailUrl, {
        signal: AbortSignal.timeout(120_000),
      });
      const raw = detail.item;
      if (!raw || typeof raw !== "object") {
        throw new Error("Resposta sem objeto item");
      }

      const name = str(raw.nome);
      if (!name) {
        throw new Error("Campo nome vazio");
      }

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
        categoryId,
        brand: str(raw.marca),
        model: str(raw.modelo),
        serialNumber: null as string | null,
        patrimonyCode,
        quantity: quantityFromApi(raw),
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
        console.log(`${label} OK (dry-run) — ${name}${patrimonyCode ? ` — patrimônio ${patrimonyCode}` : ""}`);
        created += 1;
        return;
      }

      await prisma.item.create({ data });
      console.log(`${label} criado — ${name}`);
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
      if (i >= ids.length) {
        return;
      }
      await processId(ids[i]!, i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, ids.length) }, () => worker());
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
