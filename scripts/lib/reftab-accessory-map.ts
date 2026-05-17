/**
 * Mapeamento RefTab accessory → Item do Asset Manager.
 */

export const REFTAB_ACCESSORIES_TARGET_CATEGORY = "Acessórios";

export type FieldMapRow = {
  assetManager: string;
  reftab: string;
  notes: string;
};

export const REFTAB_ACCESSORY_FIELD_MAP: FieldMapRow[] = [
  { assetManager: "name", reftab: "title", notes: "Obrigatório" },
  {
    assetManager: "qrCode",
    reftab: "barcode (ou accid se vazio)",
    notes: "Código de barras RefTab; evita duplicados",
  },
  { assetManager: "brand", reftab: "vendor", notes: "Fabricante / fornecedor" },
  {
    assetManager: "serialNumber",
    reftab: "orderNumber",
    notes: "Número de série / referência RefTab (ex.: SLS-AC-7)",
  },
  {
    assetManager: "quantity",
    reftab: "quantity",
    notes: "Stock RefTab (pode ser > 1)",
  },
  { assetManager: "location", reftab: "locationName", notes: "" },
  {
    assetManager: "purchaseYear",
    reftab: "purchaseDate ou ano atual",
    notes: "",
  },
  {
    assetManager: "purchaseDate",
    reftab: "purchaseDate",
    notes: "Opcional; muitos vazios",
  },
  {
    assetManager: "description",
    reftab: "details (campos custom)",
    notes: "VOLT/POTENCIA, COMPRIMENTO DO CABO, etc.",
  },
  {
    assetManager: "categoryId",
    reftab: "(fixo)",
    notes: `Categoria "${REFTAB_ACCESSORIES_TARGET_CATEGORY}" no AM`,
  },
  {
    assetManager: "notes",
    reftab: "notes + details[LINK NOTA FISCAL] + accid/upid",
    notes: "Rastreio RefTab",
  },
  {
    assetManager: "images[].url",
    reftab: "thumbnail",
    notes: "Única imagem disponível na API",
  },
  {
    assetManager: "condition",
    reftab: "(fixo)",
    notes: "GOOD",
  },
  {
    assetManager: "insuranceStatus",
    reftab: "(fixo)",
    notes: "NOT_INSURED",
  },
];

export type ReftabAccessory = {
  accid?: number | string;
  title?: string;
  barcode?: string;
  vendor?: string;
  orderNumber?: string;
  quantity?: number | string;
  available?: number | string;
  locationName?: string;
  purchaseDate?: string;
  notes?: string;
  thumbnail?: string;
  upid?: number;
  accessoryCategoryName?: string | null;
  details?: Record<string, unknown>;
};

export type MappedAccessoryDraft = {
  reftabAccid: string;
  name: string;
  qrCode: string | null;
  brand: string | null;
  serialNumber: string | null;
  description: string | null;
  location: string | null;
  purchaseYear: number;
  purchaseDate: Date | null;
  quantity: number;
  notes: string | null;
  imageUrl: string | null;
};

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function normalizeQuantity(v: unknown): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function buildDescription(details: Record<string, unknown> | undefined): string | null {
  if (!details) return null;
  const lines: string[] = [];
  for (const [key, val] of Object.entries(details)) {
    if (key === "LINK NOTA FISCAL") continue;
    const s = str(val);
    if (s) lines.push(`${key}: ${s}`);
  }
  return lines.length > 0 ? lines.join("\n") : null;
}

function buildNotes(acc: ReftabAccessory): string | null {
  const parts: string[] = [];
  const base = str(acc.notes);
  if (base) parts.push(base);
  const invoice = str(acc.details?.["LINK NOTA FISCAL"]);
  if (invoice) parts.push(`Nota fiscal: ${invoice}`);
  const cat = str(acc.accessoryCategoryName ?? undefined);
  if (cat) parts.push(`Categoria RefTab: ${cat}`);
  const meta: string[] = [];
  if (acc.accid != null) meta.push(`accid=${acc.accid}`);
  if (acc.upid != null) meta.push(`upid=${acc.upid}`);
  if (acc.available != null) meta.push(`disponível=${acc.available}`);
  if (meta.length) parts.push(`[RefTab ${meta.join(", ")}]`);
  return parts.length > 0 ? parts.join("\n") : null;
}

export function mapReftabAccessoryToDraft(
  acc: ReftabAccessory,
): MappedAccessoryDraft | null {
  const name = str(acc.title);
  if (!name) return null;

  const reftabAccid =
    acc.accid != null ? String(acc.accid).trim() : "";
  if (!reftabAccid) return null;

  const qrCode =
    str(acc.barcode) ?? `acc-${reftabAccid}`;

  const purchaseDate = parseDate(acc.purchaseDate);
  let purchaseYear = new Date().getFullYear();
  if (purchaseDate) {
    const y = purchaseDate.getFullYear();
    if (y >= 1900 && y <= 2100) purchaseYear = y;
  }

  const thumb = str(acc.thumbnail);

  return {
    reftabAccid,
    name,
    qrCode,
    brand: str(acc.vendor),
    serialNumber: str(acc.orderNumber),
    description: buildDescription(acc.details),
    location: str(acc.locationName),
    purchaseYear,
    purchaseDate,
    quantity: normalizeQuantity(acc.quantity),
    notes: buildNotes(acc),
    imageUrl: thumb,
  };
}

export function printAccessoryFieldMapTable(): void {
  const col1 = 20;
  const col2 = 42;
  console.log(
    `\n=== Mapa de campos — RefTab accessories → "${REFTAB_ACCESSORIES_TARGET_CATEGORY}" ===\n`,
  );
  const header =
    "Asset Manager".padEnd(col1) + "RefTab".padEnd(col2) + "Notas";
  console.log(header);
  console.log("-".repeat(Math.min(100, header.length + 20)));
  for (const row of REFTAB_ACCESSORY_FIELD_MAP) {
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

export function formatAccessoryDraftPreview(d: MappedAccessoryDraft): string {
  return [
    `  accid: ${d.reftabAccid}`,
    `  nome: ${d.name}`,
    `  QR: ${d.qrCode ?? "—"}`,
    `  marca: ${d.brand ?? "—"} | série: ${d.serialNumber ?? "—"}`,
    `  quantidade: ${d.quantity}`,
    `  local: ${d.location ?? "—"}`,
    `  compra: ano ${d.purchaseYear}${d.purchaseDate ? ` (${d.purchaseDate.toISOString().slice(0, 10)})` : ""}`,
    `  imagem: ${d.imageUrl ? "sim" : "não"}`,
    d.description
      ? `  descrição: ${d.description.split("\n")[0]?.slice(0, 60)}…`
      : "  descrição: —",
  ].join("\n");
}
