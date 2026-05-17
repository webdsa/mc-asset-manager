/**
 * @deprecated Use `import-reftab-category.ts lente` ou `npm run reftab:import-lente`
 */
import { runReftabCategoryImport } from "./lib/reftab-import-runner";
import { REFTAB_PROFILE_LENTE } from "./lib/reftab-asset-map";

runReftabCategoryImport(REFTAB_PROFILE_LENTE).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
