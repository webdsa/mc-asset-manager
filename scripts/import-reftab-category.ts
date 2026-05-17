/**
 * Importa itens de uma categoria RefTab (perfil via argumento).
 *
 * Uso: npx tsx scripts/import-reftab-category.ts audio|lente [--apply]
 */

import { resolveProfile } from "./lib/reftab-asset-map";
import { runReftabCategoryImport } from "./lib/reftab-import-runner";

const positional = process.argv.slice(2).find((a) => !a.startsWith("--"));
const profile = resolveProfile(positional);

runReftabCategoryImport(profile).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
