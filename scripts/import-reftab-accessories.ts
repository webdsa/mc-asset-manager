/**
 * Importa acessórios do RefTab (GET /api/accessories) para o Asset Manager.
 *
 * Uso:
 *   npm run reftab:import-accessories
 *   npm run reftab:import-accessories -- --apply
 *   npm run reftab:import-accessories -- --apply --yes
 *
 * Env:
 *   REFTAB_IMPORT_TARGET_CATEGORY — default: Acessórios
 *   REFTAB_SKIP_EXISTING — default true (qrCode)
 *   REFTAB_CREATE_CATEGORY — cria categoria se não existir
 */

import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { PrismaClient } from "@/generated/prisma/client";
import { InsuranceStatus, ItemCondition } from "@/generated/prisma/client";
import { createPrismaDriverAdapter } from "@/lib/prisma-driver-adapter";
import { envBool } from "./lib/external-api-shared";
import { getReftabConfig, reftabJson, unwrapReftabList } from "./lib/reftab-api";
import {
  REFTAB_ACCESSORIES_TARGET_CATEGORY,
  type ReftabAccessory,
  mapReftabAccessoryToDraft,
  printAccessoryFieldMapTable,
  formatAccessoryDraftPreview,
} from "./lib/reftab-accessory-map";
import { downloadAndSaveImage } from "./lib/save-imported-image";

const DEFAULT_CATEGORY_COLOR = "#64748b";

async function fetchAllAccessories(): Promise<ReftabAccessory[]> {
  const config = getReftabConfig();
  const limit = 500;
  let offset = 0;
  const all: ReftabAccessory[] = [];

  for (;;) {
    const path = `/accessories?limit=${limit}&offset=${offset}`;
    const raw = await reftabJson<unknown>(config, path);
    const page = unwrapReftabList<ReftabAccessory>(raw);
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }

  return all;
}

function targetCategoryName(): string {
  return (
    process.env.REFTAB_IMPORT_TARGET_CATEGORY?.trim() ||
    REFTAB_ACCESSORIES_TARGET_CATEGORY
  );
}

async function confirmImport(count: number): Promise<boolean> {
  if (process.argv.includes("--yes")) return true;
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      `\nImportar ${count} acessório(s) para "${targetCategoryName()}"? [s/N] `,
    );
    const normalized = answer.trim().toLowerCase();
    return (
      normalized === "s" ||
      normalized === "sim" ||
      normalized === "y" ||
      normalized === "yes"
    );
  } finally {
    rl.close();
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const apply = process.argv.includes("--apply");
  const skipExisting =
    process.env.REFTAB_SKIP_EXISTING !== undefined
      ? envBool("REFTAB_SKIP_EXISTING")
      : true;
  const createCategory = envBool("REFTAB_CREATE_CATEGORY");

  printAccessoryFieldMapTable();

  console.log("A obter acessórios RefTab…");
  const accessories = await fetchAllAccessories();
  console.log(`RefTab: ${accessories.length} acessório(s).\n`);

  const drafts = accessories
    .map((a) => mapReftabAccessoryToDraft(a))
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const skippedMap = accessories.length - drafts.length;
  if (skippedMap > 0) {
    console.warn(`${skippedMap} registo(s) ignorado(s) — sem title ou accid.`);
  }

  const previewCount = Math.min(3, drafts.length);
  if (previewCount > 0) {
    console.log(
      `=== Pré-visualização (${previewCount} de ${drafts.length}) ===\n`,
    );
    for (let i = 0; i < previewCount; i++) {
      console.log(formatAccessoryDraftPreview(drafts[i]!));
      console.log("");
    }
  }

  if (!apply) {
    console.log(
      "Modo revisão. Se o mapa estiver correto, importe com:\n" +
        "  npm run reftab:import-accessories -- --apply\n" +
        "  npm run reftab:import-accessories -- --apply --yes\n",
    );
    return;
  }

  if (dryRun) {
    console.log(`[DRY-RUN] Seriam importados ${drafts.length} acessório(s).`);
    return;
  }

  const catName = targetCategoryName();
  const ok = await confirmImport(drafts.length);
  if (!ok) {
    console.log("Importação cancelada.");
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Defina DATABASE_URL no .env");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: createPrismaDriverAdapter(connectionString),
  });

  let category = await prisma.category.findUnique({
    where: { name: catName },
    select: { id: true, name: true },
  });

  if (!category) {
    if (createCategory) {
      category = await prisma.category.create({
        data: { name: catName, color: DEFAULT_CATEGORY_COLOR, isPublic: false },
        select: { id: true, name: true },
      });
      console.log(`Categoria "${catName}" criada.`);
    } else {
      console.error(
        `Categoria "${catName}" não existe. Crie-a na UI ou REFTAB_CREATE_CATEGORY=1.`,
      );
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i]!;
    const label = `[${i + 1}/${drafts.length}] ${d.qrCode ?? d.reftabAccid}`;
    try {
      if (skipExisting && d.qrCode) {
        const exists = await prisma.item.findFirst({
          where: { qrCode: d.qrCode },
          select: { id: true },
        });
        if (exists) {
          console.log(`${label} ignorado — qrCode já existe.`);
          skipped += 1;
          continue;
        }
      }

      let images:
        | { create: { fileName: string; url: string; alt: string }[] }
        | undefined;
      if (d.imageUrl) {
        const img = await downloadAndSaveImage(d.imageUrl, d.name);
        if (img.ok) {
          images = {
            create: [{ fileName: img.fileName, url: img.url, alt: d.name }],
          };
        } else {
          console.warn(`${label} imagem não transferida: ${img.reason}`);
        }
      }

      await prisma.item.create({
        data: {
          name: d.name,
          description: d.description,
          categoryId: category.id,
          brand: d.brand,
          model: null,
          serialNumber: d.serialNumber,
          qrCode: d.qrCode,
          quantity: d.quantity,
          location: d.location,
          purchaseYear: d.purchaseYear,
          purchaseDate: d.purchaseDate,
          purchaseValue: null,
          supplier: null,
          condition: ItemCondition.GOOD,
          insuranceStatus: InsuranceStatus.NOT_INSURED,
          notes: d.notes,
          images,
        },
      });

      console.log(`${label} criado — ${d.name} (qtd=${d.quantity})`);
      created += 1;
    } catch (e) {
      failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${label} ERRO: ${msg}`);
    }
  }

  await prisma.$disconnect();
  console.log(
    `\nConcluído. criados=${created} ignorados=${skipped} falhas=${failed}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
