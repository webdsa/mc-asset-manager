/**
 * Importa "Luz para estúdio" do RefTab (cid 88520) → categoria "Luz" no Asset Manager.
 *
 * Uso:
 *   npm run reftab:import-luz
 *   npm run reftab:import-luz -- --apply
 */
import { runReftabCategoryImport } from "./lib/reftab-import-runner";
import { REFTAB_PROFILE_LUZ } from "./lib/reftab-asset-map";

runReftabCategoryImport(REFTAB_PROFILE_LUZ).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
