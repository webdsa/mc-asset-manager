/**
 * Corrige acessórios importados do RefTab: move `model` → `serialNumber`
 * (orderNumber tinha sido gravado no campo errado).
 *
 * Uso:
 *   npx tsx scripts/fix-reftab-accessories-serial.ts           # pré-visualização
 *   npx tsx scripts/fix-reftab-accessories-serial.ts --apply   # aplica
 *
 * Env:
 *   REFTAB_IMPORT_TARGET_CATEGORY — default: Acessórios
 */

import "./lib/external-api-shared";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaDriverAdapter } from "@/lib/prisma-driver-adapter";
import { REFTAB_ACCESSORIES_TARGET_CATEGORY } from "./lib/reftab-accessory-map";

function categoryName(): string {
  return (
    process.env.REFTAB_IMPORT_TARGET_CATEGORY?.trim() ||
    REFTAB_ACCESSORIES_TARGET_CATEGORY
  );
}

async function main() {
  const apply = process.argv.includes("--apply");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Defina DATABASE_URL no .env");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: createPrismaDriverAdapter(connectionString),
  });

  const catName = categoryName();
  const category = await prisma.category.findUnique({
    where: { name: catName },
    select: { id: true, name: true },
  });

  if (!category) {
    console.error(`Categoria "${catName}" não encontrada.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const items = await prisma.item.findMany({
    where: {
      categoryId: category.id,
      hiddenAt: null,
      model: { not: null },
    },
    select: {
      id: true,
      name: true,
      qrCode: true,
      model: true,
      serialNumber: true,
    },
    orderBy: { name: "asc" },
  });

  if (items.length === 0) {
    console.log(`Nenhum item em "${catName}" com campo model preenchido.`);
    await prisma.$disconnect();
    return;
  }

  console.log(
    `Categoria "${catName}": ${items.length} item(ns) com model preenchido${apply ? "" : " [pré-visualização]"}\n`,
  );

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const orderAsSerial = item.model!.trim();
    const label = `${item.qrCode ?? item.id} — ${item.name}`;

    if (!orderAsSerial) {
      console.log(`${label} — model vazio, ignorado`);
      skipped += 1;
      continue;
    }

    if (item.serialNumber?.trim() === orderAsSerial) {
      if (apply) {
        await prisma.item.update({
          where: { id: item.id },
          data: { model: null },
        });
      }
      console.log(`${label} — série já correta; limpa model`);
      updated += 1;
      continue;
    }

    if (item.serialNumber?.trim()) {
      console.warn(
        `${label} — serialNumber já definido ("${item.serialNumber}"); model="${orderAsSerial}" não alterado`,
      );
      skipped += 1;
      continue;
    }

    const conflict = await prisma.item.findFirst({
      where: {
        serialNumber: orderAsSerial,
        id: { not: item.id },
      },
      select: { id: true, name: true },
    });

    if (conflict) {
      console.warn(
        `${label} — série "${orderAsSerial}" já usada por "${conflict.name}"`,
      );
      skipped += 1;
      continue;
    }

    console.log(
      `${label}\n  model → serialNumber: "${orderAsSerial}"\n  model → null`,
    );

    if (apply) {
      try {
        await prisma.item.update({
          where: { id: item.id },
          data: {
            serialNumber: orderAsSerial,
            model: null,
          },
        });
        updated += 1;
      } catch (e) {
        failed += 1;
        console.error(
          `${label} — ERRO:`,
          e instanceof Error ? e.message : e,
        );
      }
    } else {
      updated += 1;
    }
  }

  await prisma.$disconnect();

  console.log(
    `\nConcluído. ${apply ? "atualizados" : "a corrigir"}=${updated} ignorados=${skipped} falhas=${failed}`,
  );
  if (!apply && updated > 0) {
    console.log("\nPara aplicar: npx tsx scripts/fix-reftab-accessories-serial.ts --apply");
  }
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
