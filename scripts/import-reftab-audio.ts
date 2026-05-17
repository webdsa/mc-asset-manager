/**
 * Importa categoria Audio do RefTab (cid 88519) → "Áudio" no Asset Manager.
 *
 * Uso:
 *   npm run reftab:import-audio
 *   npm run reftab:import-audio -- --apply
 */
import { runReftabCategoryImport } from "./lib/reftab-import-runner";
import { REFTAB_PROFILE_AUDIO } from "./lib/reftab-asset-map";

runReftabCategoryImport(REFTAB_PROFILE_AUDIO).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
