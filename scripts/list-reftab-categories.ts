/**
 * Lista todas as categorias da conta RefTab.
 *
 * Uso:
 *   npx tsx scripts/list-reftab-categories.ts
 *   npx tsx scripts/list-reftab-categories.ts --json
 */

import {
  getReftabConfig,
  reftabJson,
  unwrapReftabList,
} from "./lib/reftab-api";

type ReftabCategory = {
  cid?: number | string;
  name?: string;
  [key: string]: unknown;
};

async function main() {
  const asJson = process.argv.includes("--json");
  const config = getReftabConfig();
  const raw = await reftabJson<unknown>(config, "/categories");
  const categories = unwrapReftabList<ReftabCategory>(raw).sort((a, b) =>
    String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt-BR", {
      sensitivity: "base",
    }),
  );

  if (asJson) {
    console.log(JSON.stringify(categories, null, 2));
    return;
  }

  if (categories.length === 0) {
    console.log("Nenhuma categoria encontrada.");
    return;
  }

  console.log(`Categorias RefTab (${categories.length}):\n`);
  console.log("CID\tNome");
  console.log("---\t----");
  for (const cat of categories) {
    const cid = cat.cid != null ? String(cat.cid) : "—";
    const name = cat.name != null ? String(cat.name) : "—";
    console.log(`${cid}\t${name}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
