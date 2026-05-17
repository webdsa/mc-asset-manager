/**
 * Importa categoria Camera do RefTab (cid 88465) → "Câmera" no Asset Manager.
 *
 * Uso:
 *   npm run reftab:import-camera
 *   npm run reftab:import-camera -- --apply
 */
import { runReftabCategoryImport } from "./lib/reftab-import-runner";
import { REFTAB_PROFILE_CAMERA } from "./lib/reftab-asset-map";

runReftabCategoryImport(REFTAB_PROFILE_CAMERA).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
