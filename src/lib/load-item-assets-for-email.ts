import { readFile } from "fs/promises";
import path from "path";
import { get } from "@vercel/blob";
import { privateItemImagePathname } from "@/lib/item-image";
import { prisma } from "@/lib/prisma";

export type EmailFileAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

function sanitizeFilename(name: string): string {
  const base = path.basename(name.replace(/[\r\n]/g, "_"));
  return base.slice(0, 180) || "anexo";
}

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

async function readPublicUpload(relativeUrl: string): Promise<Buffer | null> {
  const relative = path.normalize(relativeUrl.replace(/^\/+/, ""));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  const publicRoot = path.resolve(process.cwd(), "public");
  const abs = path.resolve(publicRoot, relative);
  if (!abs.startsWith(publicRoot + path.sep) && abs !== publicRoot) {
    return null;
  }
  try {
    return await readFile(abs);
  } catch {
    return null;
  }
}

export async function loadItemInvoiceForEmail(itemId: string): Promise<EmailFileAttachment | null> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { invoiceFileUrl: true, invoiceFileName: true },
  });

  if (!item?.invoiceFileUrl) {
    return null;
  }

  const url = item.invoiceFileUrl;
  const filename = sanitizeFilename(item.invoiceFileName ?? "nota-fiscal.pdf");

  if (url.startsWith("https://") && url.includes(".vercel-storage.com")) {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) {
      return null;
    }
    const result = await get(url, { access: "private", token });
    if (!result?.stream) {
      return null;
    }
    const content = await streamToBuffer(result.stream);
    return {
      filename,
      content,
      contentType: result.blob.contentType,
    };
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const content = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") ?? undefined;
    return { filename, content, contentType: ct ?? undefined };
  }

  if (url.startsWith("/")) {
    const content = await readPublicUpload(url);
    if (!content) {
      return null;
    }
    const abs = path.resolve(process.cwd(), "public", path.normalize(url.replace(/^\/+/, "")));
    return { filename, content, contentType: mimeFromPath(abs) };
  }

  return null;
}

async function loadOneItemImage(
  image: { url: string; fileName: string },
  index: number,
): Promise<EmailFileAttachment | null> {
  const label = sanitizeFilename(
    `foto-${String(index + 1).padStart(2, "0")}-${image.fileName}`,
  );

  const pathname = privateItemImagePathname(image.url);
  if (pathname) {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) {
      return null;
    }
    const result = await get(pathname, { access: "private", token });
    if (!result?.stream) {
      return null;
    }
    const content = await streamToBuffer(result.stream);
    return {
      filename: label,
      content,
      contentType: result.blob.contentType,
    };
  }

  if (image.url.startsWith("/")) {
    const content = await readPublicUpload(image.url);
    if (!content) {
      return null;
    }
    const abs = path.resolve(process.cwd(), "public", path.normalize(image.url.replace(/^\/+/, "")));
    return { filename: label, content, contentType: mimeFromPath(abs) };
  }

  if (image.url.startsWith("http://") || image.url.startsWith("https://")) {
    const res = await fetch(image.url);
    if (!res.ok) {
      return null;
    }
    const content = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") ?? undefined;
    return { filename: label, content, contentType: ct ?? undefined };
  }

  return null;
}

export async function loadItemImagesForEmail(itemId: string): Promise<EmailFileAttachment[]> {
  const images = await prisma.itemImage.findMany({
    where: { itemId },
    orderBy: { createdAt: "asc" },
    select: { url: true, fileName: true },
  });

  const results = await Promise.all(images.map((img, i) => loadOneItemImage(img, i)));

  return results.filter((x): x is EmailFileAttachment => x != null);
}

export async function loadItemAssetsForInsuranceEmail(
  itemId: string | null | undefined,
): Promise<EmailFileAttachment[]> {
  const id = itemId?.trim();
  if (!id) {
    return [];
  }

  const [images, invoice] = await Promise.all([
    loadItemImagesForEmail(id),
    loadItemInvoiceForEmail(id),
  ]);

  const out: EmailFileAttachment[] = [...images];
  if (invoice) {
    out.push(invoice);
  }
  return out;
}
