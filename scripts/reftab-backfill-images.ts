/**
 * Repõe imagens de itens já importados do RefTab (qrCode = aid) sem ItemImage.
 *
 * Uso:
 *   npx tsx scripts/reftab-backfill-images.ts
 *   npx tsx scripts/reftab-backfill-images.ts MCDSA043 MCDSA210
 *   npx tsx scripts/reftab-backfill-images.ts --dry-run
 */

import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaDriverAdapter } from "@/lib/prisma-driver-adapter";
import { getReftabConfig, reftabJson } from "./lib/reftab-api";
import { type ReftabAsset } from "./lib/reftab-asset-map";
import { downloadAndSaveImage } from "./lib/save-imported-image";

function imageUrlFromAsset(asset: ReftabAsset): string | null {
  const full =
    typeof asset.image?.full === "string" ? asset.image.full.trim() : "";
  if (full) return full;
  const link = typeof asset.imageLink === "string" ? asset.imageLink.trim() : "";
  return link || null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const aids = process.argv
    .slice(2)
    .filter((a) => a && !a.startsWith("--"));

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Defina DATABASE_URL no .env");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: createPrismaDriverAdapter(connectionString),
  });

  const items = await prisma.item.findMany({
    where: {
      hiddenAt: null,
      ...(aids.length > 0 ? { qrCode: { in: aids } } : {}),
      images: { none: {} },
      qrCode: { not: null },
    },
    select: { id: true, name: true, qrCode: true },
    orderBy: { qrCode: "asc" },
  });

  if (items.length === 0) {
    console.log("Nenhum item sem imagem (com qrCode) encontrado.");
    await prisma.$disconnect();
    return;
  }

  console.log(`${items.length} item(ns) sem imagem a processar${dryRun ? " [DRY-RUN]" : ""}.`);

  const config = getReftabConfig();
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const aid = item.qrCode!.trim();
    const label = `${aid} (${item.name})`;
    try {
      const asset = await reftabJson<ReftabAsset>(
        config,
        `/assets/${encodeURIComponent(aid)}`,
      );
      const url = imageUrlFromAsset(asset);
      if (!url) {
        console.log(`${label} — sem URL de imagem no RefTab`);
        skipped += 1;
        continue;
      }
      if (dryRun) {
        console.log(`${label} — reporia imagem (dry-run)`);
        ok += 1;
        continue;
      }
      const img = await downloadAndSaveImage(url, item.name);
      if (!img.ok) {
        console.warn(`${label} — falha: ${img.reason}`);
        failed += 1;
        continue;
      }
      await prisma.itemImage.create({
        data: {
          itemId: item.id,
          fileName: img.fileName,
          url: img.url,
          alt: item.name,
        },
      });
      console.log(`${label} — imagem adicionada`);
      ok += 1;
    } catch (e) {
      failed += 1;
      console.error(`${label} — ERRO:`, e instanceof Error ? e.message : e);
    }
  }

  await prisma.$disconnect();
  console.log(`\nConcluído. ok=${ok} sem_imagem_reftab=${skipped} falhas=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
