/**
 * Mapeamento RefTab asset → rascunho de Item do Asset Manager.
 */

import type { ReftabCategoryProfile } from "./reftab-category-profiles";
import { REFTAB_PROFILE_LENTE } from "./reftab-category-profiles";

export type { FieldMapRow, ReftabCategoryProfile } from "./reftab-category-profiles";
export {
  REFTAB_PROFILE_LENTE,
  REFTAB_PROFILE_AUDIO,
  REFTAB_PROFILE_CAMERA,
  REFTAB_PROFILE_LUZ,
  REFTAB_PROFILE_VIDEO,
  REFTAB_PROFILES,
  resolveProfile,
} from "./reftab-category-profiles";

/** @deprecated use REFTAB_PROFILE_LENTE.reftabCid */
export const REFTAB_LENTE_CID = REFTAB_PROFILE_LENTE.reftabCid;
/** @deprecated use REFTAB_PROFILE_LENTE.targetCategoryName */
export const REFTAB_LENTE_CATEGORY_NAME = REFTAB_PROFILE_LENTE.targetCategoryName;

export type ReftabAsset = {
  aid?: string;
  title?: string;
  catName?: string;
  cid?: number;
  created?: string;
  locationName?: string;
  notes?: string;
  upid?: number;
  statid?: number;
  imageLink?: string;
  image?: { full?: string; filename?: string };
  status?: { name?: string };
  details?: Record<string, unknown>;
};

export type MappedItemDraft = {
  reftabAid: string;
  name: string;
  qrCode: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  description: string | null;
  location: string | null;
  purchaseYear: number;
  purchaseDate: Date | null;
  purchaseValue: number | null;
  warrantyExpires: Date | null;
  notes: string | null;
  quantity: number;
  imageUrl: string | null;
};

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function detailStr(
  details: Record<string, unknown> | undefined,
  key: string,
): string | null {
  if (!details) return null;
  return str(details[key]);
}

function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** RefTab guarda valores monetários como inteiro em centavos (ex.: 506100 → 5061.00). */
export function parseReftabMoney(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    if (Number.isInteger(v) && Math.abs(v) >= 100) {
      return v / 100;
    }
    return v;
  }
  const s = str(v);
  if (!s) return null;
  let n = s.replace(/[^\d,.-]/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(n)) {
    n = n.replace(/\./g, "").replace(",", ".");
  } else if (n.includes(",")) {
    n = n.replace(",", ".");
  }
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  if (Number.isInteger(num) && Math.abs(num) >= 100 && !s.includes(",") && !/\.\d{2}$/.test(s)) {
    return num / 100;
  }
  return num;
}

function parseYearValue(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    const y = Math.floor(v);
    if (y >= 1900 && y <= 2100) return y;
  }
  const s = str(v);
  if (!s) return null;
  const y = Math.floor(Number(s.replace(/[^\d]/g, "")));
  if (Number.isFinite(y) && y >= 1900 && y <= 2100) return y;
  return null;
}

function purchaseYearFrom(
  asset: ReftabAsset,
  profile: ReftabCategoryProfile,
): number {
  if (profile.purchaseYearDetailKey) {
    const fromDetail = parseYearValue(
      asset.details?.[profile.purchaseYearDetailKey],
    );
    if (fromDetail != null) return fromDetail;
  }
  const purchase = parseDate(asset.details?.["Data da compra"]);
  if (purchase) {
    const y = purchase.getFullYear();
    if (y >= 1900 && y <= 2100) return y;
  }
  const created = parseDate(asset.created);
  if (created) {
    const y = created.getFullYear();
    if (y >= 1900 && y <= 2100) return y;
  }
  return new Date().getFullYear();
}

function buildDescription(
  asset: ReftabAsset,
  profile: ReftabCategoryProfile,
): string | null {
  const details = asset.details ?? {};
  const lines: string[] = [];
  if (asset.catName) {
    lines.push(`Categoria RefTab: ${asset.catName}`);
  }
  for (const key of profile.descriptionDetailKeys) {
    const s = str(details[key]);
    if (s) lines.push(`${key}: ${s}`);
  }
  const inColumns = new Set(profile.detailKeysInColumns);
  for (const [key, val] of Object.entries(details)) {
    if (inColumns.has(key)) continue;
    if (profile.descriptionDetailKeys.includes(key)) continue;
    const s = str(val);
    if (s) lines.push(`${key}: ${s}`);
  }
  return lines.length > 0 ? lines.join("\n") : null;
}

function buildNotes(asset: ReftabAsset): string | null {
  const parts: string[] = [];
  const base = str(asset.notes);
  if (base) parts.push(base);
  const invoiceLink = str(asset.details?.["Link nota fiscal"]);
  if (invoiceLink) parts.push(`Nota fiscal: ${invoiceLink}`);
  const meta: string[] = [];
  if (asset.upid != null) meta.push(`upid=${asset.upid}`);
  if (asset.statid != null) meta.push(`statid=${asset.statid}`);
  const statusName = asset.status?.name;
  if (statusName) meta.push(`status=${statusName}`);
  if (meta.length) parts.push(`[RefTab ${meta.join(", ")}]`);
  return parts.length > 0 ? parts.join("\n") : null;
}

export function mapReftabAssetToDraft(
  asset: ReftabAsset,
  profile: ReftabCategoryProfile = REFTAB_PROFILE_LENTE,
): MappedItemDraft | null {
  const name = str(asset.title);
  const reftabAid = str(asset.aid);
  if (!name || !reftabAid) return null;

  const imageUrl =
    str(asset.image?.full) ?? str(asset.imageLink) ?? null;

  return {
    reftabAid,
    name,
    qrCode: reftabAid,
    brand: detailStr(asset.details, "Marca"),
    model: detailStr(asset.details, profile.modelDetailKey),
    serialNumber: detailStr(asset.details, "Número de série"),
    description: buildDescription(asset, profile),
    location: str(asset.locationName),
    purchaseYear: purchaseYearFrom(asset, profile),
    purchaseDate: parseDate(asset.details?.["Data da compra"]),
    purchaseValue: parseReftabMoney(asset.details?.["Valor da compra"]),
    warrantyExpires: parseDate(asset.details?.["Validade da garantia"]),
    notes: buildNotes(asset),
    quantity: 1,
    imageUrl,
  };
}

export function printFieldMapTable(profile: ReftabCategoryProfile): void {
  const col1 = 20;
  const col2 = 42;
  console.log(
    `\n=== Mapa de campos — ${profile.reftabCategoryName} (cid ${profile.reftabCid}) → "${profile.targetCategoryName}" ===\n`,
  );
  const header =
    "Asset Manager".padEnd(col1) + "RefTab".padEnd(col2) + "Notas";
  console.log(header);
  console.log("-".repeat(Math.min(100, header.length + 20)));
  for (const row of profile.fieldMap) {
    const reftab =
      row.reftab.length > col2 - 1
        ? `${row.reftab.slice(0, col2 - 4)}…`
        : row.reftab;
    console.log(
      row.assetManager.padEnd(col1) + reftab.padEnd(col2) + row.notes,
    );
  }
  console.log("");
}

export function formatDraftPreview(d: MappedItemDraft): string {
  return [
    `  aid: ${d.reftabAid}`,
    `  nome: ${d.name}`,
    `  QR: ${d.qrCode ?? "—"}`,
    `  marca: ${d.brand ?? "—"} | modelo: ${d.model ?? "—"}`,
    `  série: ${d.serialNumber ?? "—"}`,
    `  local: ${d.location ?? "—"}`,
    `  compra: ano ${d.purchaseYear}${d.purchaseDate ? ` (${d.purchaseDate.toISOString().slice(0, 10)})` : ""}`,
    `  valor: ${d.purchaseValue != null ? d.purchaseValue.toFixed(2) : "—"}`,
    `  imagem: ${d.imageUrl ? "sim" : "não"}`,
    d.description
      ? `  descrição: ${d.description.split("\n")[0]?.slice(0, 60)}…`
      : "  descrição: —",
  ].join("\n");
}
