/**
 * Importa "Video / Transmissão" do RefTab (cid 90159) → "Vídeo" no Asset Manager.
 *
 * Uso:
 *   npm run reftab:import-video
 *   npm run reftab:import-video -- --apply
 */
import { runReftabCategoryImport } from "./lib/reftab-import-runner";
import { REFTAB_PROFILE_VIDEO } from "./lib/reftab-asset-map";

runReftabCategoryImport(REFTAB_PROFILE_VIDEO).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
