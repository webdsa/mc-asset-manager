import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { PrismaClient } from "@/generated/prisma/client";
import { InsuranceStatus, ItemCondition } from "@/generated/prisma/client";
import { createPrismaDriverAdapter } from "@/lib/prisma-driver-adapter";
import { envBool } from "./external-api-shared";
import { getReftabConfig, reftabJson, unwrapReftabList } from "./reftab-api";
import {
  type ReftabCategoryProfile,
  type ReftabAsset,
  mapReftabAssetToDraft,
  printFieldMapTable,
  formatDraftPreview,
} from "./reftab-asset-map";
import { downloadAndSaveImage } from "./save-imported-image";

const DEFAULT_CATEGORY_COLOR = "#4f46e5";

function targetCategoryName(profile: ReftabCategoryProfile): string {
  return (
    process.env.REFTAB_IMPORT_TARGET_CATEGORY?.trim() ||
    profile.targetCategoryName
  );
}

function reftabCid(profile: ReftabCategoryProfile): number {
  const raw = process.env.REFTAB_CATEGORY_CID?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.floor(n);
  }
  return profile.reftabCid;
}

async function fetchCategoryAssets(
  profile: ReftabCategoryProfile,
): Promise<ReftabAsset[]> {
  const config = getReftabConfig();
  const cid = reftabCid(profile);
  const limit = 500;
  let offset = 0;
  const all: ReftabAsset[] = [];

  for (;;) {
    const path = `/assets?cid=${cid}&limit=${limit}&offset=${offset}`;
    const raw = await reftabJson<unknown>(config, path);
    const page = unwrapReftabList<ReftabAsset>(raw);
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }

  return all;
}

async function confirmImport(
  count: number,
  categoryName: string,
): Promise<boolean> {
  if (process.argv.includes("--yes")) return true;
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      `\nImportar ${count} item(ns) para a categoria "${categoryName}"? [s/N] `,
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

export async function runReftabCategoryImport(
  profile: ReftabCategoryProfile,
): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const apply = process.argv.includes("--apply");
  const skipExisting =
    process.env.REFTAB_SKIP_EXISTING !== undefined
      ? envBool("REFTAB_SKIP_EXISTING")
      : true;
  const createCategory = envBool("REFTAB_CREATE_CATEGORY");

  printFieldMapTable(profile);

  console.log(
    `A obter assets RefTab — ${profile.reftabCategoryName} (cid=${reftabCid(profile)})…`,
  );
  const assets = await fetchCategoryAssets(profile);
  console.log(`RefTab: ${assets.length} asset(s).\n`);

  const drafts = assets
    .map((a) => mapReftabAssetToDraft(a, profile))
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const skippedMap = assets.length - drafts.length;
  if (skippedMap > 0) {
    console.warn(`${skippedMap} asset(s) ignorado(s) — sem title ou aid.`);
  }

  const previewCount = Math.min(3, drafts.length);
  if (previewCount > 0) {
    console.log(
      `=== Pré-visualização (${previewCount} de ${drafts.length}) ===\n`,
    );
    for (let i = 0; i < previewCount; i++) {
      console.log(formatDraftPreview(drafts[i]!));
      console.log("");
    }
  }

  const npmScriptByProfile: Record<string, string> = {
    audio: "reftab:import-audio",
    camera: "reftab:import-camera",
    luz: "reftab:import-luz",
    video: "reftab:import-video",
    lente: "reftab:import-lente",
  };
  const npmScript = npmScriptByProfile[profile.id] ?? "reftab:import-lente";

  if (!apply) {
    console.log(
      "Modo revisão. Se o mapa estiver correto, importe com:\n" +
        `  npm run ${npmScript} -- --apply\n` +
        `  npm run ${npmScript} -- --apply --yes\n`,
    );
    return;
  }

  if (dryRun) {
    console.log(`[DRY-RUN] Seriam importados ${drafts.length} item(ns).`);
    return;
  }

  const catName = targetCategoryName(profile);
  const ok = await confirmImport(drafts.length, catName);
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
        `Categoria "${catName}" não existe no Asset Manager. Crie-a (ex.: seed tem "Áudio") ou REFTAB_CREATE_CATEGORY=1.`,
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
    const label = `[${i + 1}/${drafts.length}] ${d.reftabAid}`;
    try {
      if (skipExisting) {
        const exists = await prisma.item.findFirst({
          where: {
            OR: [
              ...(d.qrCode ? [{ qrCode: d.qrCode }] : []),
              ...(d.serialNumber ? [{ serialNumber: d.serialNumber }] : []),
            ],
          },
          select: { id: true },
        });
        if (exists) {
          console.log(`${label} ignorado — já existe na base.`);
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
          model: d.model,
          serialNumber: d.serialNumber,
          qrCode: d.qrCode,
          quantity: d.quantity,
          location: d.location,
          purchaseYear: d.purchaseYear,
          purchaseDate: d.purchaseDate,
          purchaseValue: d.purchaseValue,
          supplier: null,
          condition: ItemCondition.GOOD,
          insuranceStatus: InsuranceStatus.NOT_INSURED,
          warrantyExpires: d.warrantyExpires,
          notes: d.notes,
          images,
        },
      });

      console.log(`${label} criado — ${d.name}`);
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
