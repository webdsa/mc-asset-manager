/**
 * Diagnóstico de imagem RefTab para um aid.
 * Uso: npx tsx scripts/debug-reftab-image.ts MCDSA043
 */

import { getReftabConfig, reftabJson } from "./lib/reftab-api";
import { mapReftabAssetToDraft, type ReftabAsset } from "./lib/reftab-asset-map";

const aid = process.argv[2]?.trim();
if (!aid) {
  console.error("Uso: npx tsx scripts/debug-reftab-image.ts <aid>");
  process.exit(1);
}

async function probeUrl(label: string, url: string) {
  console.log(`\n--- ${label} ---`);
  console.log(url.slice(0, 120) + (url.length > 120 ? "…" : ""));
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    const ct = res.headers.get("content-type");
    const cl = res.headers.get("content-length");
    console.log("status:", res.status, res.statusText);
    console.log("content-type:", ct);
    console.log("content-length:", cl);
    if (!res.ok) {
      const body = await res.text();
      console.log("body:", body.slice(0, 300));
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    console.log("bytes downloaded:", buf.length);
    console.log("magic:", buf.subarray(0, 12).toString("hex"));
  } catch (e) {
    console.log("error:", e instanceof Error ? e.message : e);
  }
}

async function main() {
  const config = getReftabConfig();
  const asset = await reftabJson<ReftabAsset>(config, `/assets/${encodeURIComponent(aid)}`);
  const draft = mapReftabAssetToDraft(asset);

  console.log("title:", asset.title);
  console.log("filename:", asset.filename);
  console.log("image:", JSON.stringify(asset.image, null, 2));
  console.log("imageLink:", asset.imageLink ?? "(null)");
  console.log('details["Foto Equipamento"]:', asset.details?.["Foto Equipamento"]);

  if (draft) {
    console.log("\nMapped imageUrl:", draft.imageUrl ?? "(null)");
  }

  if (asset.image?.full) await probeUrl("image.full", asset.image.full);
  if (asset.imageLink && asset.imageLink !== asset.image?.full) {
    await probeUrl("imageLink", asset.imageLink);
  }
  if (asset.image?.thumbnail) await probeUrl("thumbnail", asset.image.thumbnail);

  const fotoEquip = asset.details?.["Foto Equipamento"];
  if (typeof fotoEquip === "string" && fotoEquip.startsWith("http")) {
    await probeUrl("Foto Equipamento", fotoEquip);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
