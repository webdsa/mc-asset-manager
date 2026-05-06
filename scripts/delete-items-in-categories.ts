/**
 * Apaga todos os itens (e registo de imagens em cascade) nas categorias indicadas.
 * Não remove ficheiros do Vercel Blob / disco — só linhas na base.
 *
 * Uso:
 *   npx tsx scripts/delete-items-in-categories.ts              # mostra contagem, não apaga
 *   npx tsx scripts/delete-items-in-categories.ts --apply     # apaga
 *
 * Categorias por defeito: Decoração, Móveis. Personalizar:
 *   DELETE_CATEGORIES="Decoração,Móveis" npx tsx scripts/delete-items-in-categories.ts --apply
 */

import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaDriverAdapter } from "@/lib/prisma-driver-adapter";
import "./lib/external-api-shared";

function categoryNamesFromEnv(): string[] {
  const raw = process.env.DELETE_CATEGORIES?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ["Decoração", "Móveis"];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const names = categoryNamesFromEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Defina DATABASE_URL.");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: createPrismaDriverAdapter(connectionString),
  });

  const categories = await prisma.category.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });
  if (categories.length === 0) {
    console.log("Nenhuma categoria encontrada com os nomes:", names.join(", "));
    await prisma.$disconnect();
    return;
  }

  const foundNames = new Set(categories.map((c) => c.name));
  for (const n of names) {
    if (!foundNames.has(n)) {
      console.warn(`Aviso: categoria "${n}" não existe na base.`);
    }
  }

  const categoryIds = categories.map((c) => c.id);
  const count = await prisma.item.count({
    where: { categoryId: { in: categoryIds } },
  });

  console.log(
    `Categorias: ${categories.map((c) => c.name).join(", ")} — ${count} item(ns) a apagar.`,
  );

  if (!apply) {
    console.log("Modo simulação. Passe --apply para executar a eliminação.");
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.item.deleteMany({
    where: { categoryId: { in: categoryIds } },
  });
  console.log(`Eliminados: ${result.count} item(ns).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
