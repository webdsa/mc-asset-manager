import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { PRIVATE_ITEM_IMAGE_PREFIX } from "@/lib/item-image";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** CloudFront/RefTab por vezes envia `image/jpg` em vez de `image/jpeg`. */
function normalizeImageMime(
  headerMime: string | null,
  buffer: Buffer,
): string | null {
  const lower = (headerMime ?? "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (lower === "image/jpg" || lower === "image/pjpeg") {
    return "image/jpeg";
  }
  if (ALLOWED_IMAGE_MIME.has(lower)) {
    return lower;
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return lower.length > 0 ? lower : null;
}

function mimeToExt(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes("png")) return ".png";
  if (lower.includes("webp")) return ".webp";
  return ".jpg";
}

export async function saveImportedImage(
  buffer: Buffer,
  mime: string,
  baseLabel: string,
): Promise<{ fileName: string; url: string }> {
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Imagem excede ${MAX_IMAGE_SIZE} bytes.`);
  }
  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    throw new Error(`Tipo de imagem não suportado: ${mime}`);
  }

  const ext = mimeToExt(mime);
  const safeLabel = baseLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const fileName = `${safeLabel || "imagem"}-${randomUUID()}${ext}`;

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const pathname = `item-images/${randomUUID()}${ext}`;
    const blob = await put(pathname, buffer, {
      access: "private",
      token,
      contentType: mime,
    });
    return {
      fileName,
      url: `${PRIVATE_ITEM_IMAGE_PREFIX}${blob.pathname}`,
    };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "assets");
  await mkdir(uploadDir, { recursive: true });
  const diskName = `${safeLabel || "imagem"}-${randomUUID()}${ext}`;
  await writeFile(path.join(uploadDir, diskName), buffer);
  return { fileName, url: `/uploads/assets/${diskName}` };
}

export type ImageDownloadResult =
  | { ok: true; fileName: string; url: string }
  | { ok: false; reason: string };

export async function downloadAndSaveImage(
  imageUrl: string,
  baseLabel: string,
): Promise<ImageDownloadResult> {
  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    return {
      ok: false,
      reason: `HTTP ${res.status} ${res.statusText}`,
    };
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const mime = normalizeImageMime(res.headers.get("content-type"), buffer);
  if (!mime || !ALLOWED_IMAGE_MIME.has(mime)) {
    return {
      ok: false,
      reason: `tipo não suportado (${res.headers.get("content-type") ?? "sem Content-Type"})`,
    };
  }
  if (buffer.length > MAX_IMAGE_SIZE) {
    return {
      ok: false,
      reason: `ficheiro grande demais (${buffer.length} bytes)`,
    };
  }
  try {
    const saved = await saveImportedImage(buffer, mime, baseLabel);
    return { ok: true, ...saved };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}
