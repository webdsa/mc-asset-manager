"use server";

import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InsuranceStatus, ItemCondition } from "@/generated/prisma/client";
import { parseBrlCurrencyToNumber } from "@/lib/format";
import { PRIVATE_ITEM_IMAGE_PREFIX } from "@/lib/item-image";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_INVOICE_SIZE = 16 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const INVOICE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function purchaseValueFromForm(formData: FormData) {
  const raw = formData.get("purchaseValue");
  const str = typeof raw === "string" ? raw.trim() : "";
  if (!str) {
    return null;
  }
  return parseBrlCurrencyToNumber(str);
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T12:00:00`) : null;
}

function enumValue<T extends string>(value: FormDataEntryValue | null, allowed: T[], fallback: T) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function safeFileName(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  const base = path
    .basename(file.name, extension)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  return `${base || "arquivo"}-${randomUUID()}${extension}`;
}

async function saveUpload(file: File, folder: "assets" | "invoices", maxSize: number) {
  if (!file.size) {
    return null;
  }

  if (file.size > maxSize) {
    throw new Error(`O arquivo ${file.name} excede o limite permitido.`);
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });

  const fileName = safeFileName(file);
  const filePath = path.join(uploadDir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, bytes);

  return {
    fileName,
    url: `/uploads/${folder}/${fileName}`,
  };
}

async function saveItemImage(file: File, maxSize: number) {
  if (!file.size) {
    return null;
  }

  if (file.size > maxSize) {
    throw new Error(`O arquivo ${file.name} excede o limite permitido.`);
  }

  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("As imagens precisam ser JPG, PNG ou WebP.");
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (process.env.VERCEL === "1" && !token) {
    throw new Error(
      "Vincule o Vercel Blob ao projeto e defina BLOB_READ_WRITE_TOKEN (Storage no dashboard da Vercel).",
    );
  }

  if (token) {
    const rawExt = path.extname(file.name).toLowerCase();
    const ext = rawExt && rawExt.length <= 6 ? rawExt : ".jpg";
    const pathname = `item-images/${randomUUID()}${ext}`;
    const blob = await put(pathname, file, {
      access: "private",
      token,
      contentType: file.type || undefined,
    });
    return {
      fileName: safeFileName(file),
      url: `${PRIVATE_ITEM_IMAGE_PREFIX}${blob.pathname}`,
    };
  }

  return saveUpload(file, "assets", maxSize);
}

type InvoiceSaveResult = {
  fileName: string;
  url: string | null;
};

function isVercelBlobStorageUrl(url: string): boolean {
  return url.startsWith("https://") && url.includes(".vercel-storage.com");
}

async function deleteStoredInvoiceBlob(url: string | null | undefined) {
  if (!url) {
    return;
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return;
  }
  try {
    if (isVercelBlobStorageUrl(url)) {
      await del(url, { token });
      return;
    }
    if (!url.startsWith("http") && !url.startsWith("/")) {
      await del(url, { token });
    }
  } catch {
    // Blob já removido ou inacessível — segue o fluxo.
  }
}

async function removeLocalInvoiceFile(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/invoices/")) {
    return;
  }
  const relative = path.normalize(url.replace(/^\/+/, ""));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return;
  }
  const publicRoot = path.resolve(process.cwd(), "public");
  const abs = path.resolve(publicRoot, relative);
  if (!abs.startsWith(publicRoot + path.sep) && abs !== publicRoot) {
    return;
  }
  try {
    await unlink(abs);
  } catch {
    // arquivo já removido
  }
}

async function removeLocalItemImageFile(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/assets/")) {
    return;
  }
  const relative = path.normalize(url.replace(/^\/+/, ""));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return;
  }
  const publicRoot = path.resolve(process.cwd(), "public");
  const abs = path.resolve(publicRoot, relative);
  if (!abs.startsWith(publicRoot + path.sep) && abs !== publicRoot) {
    return;
  }
  try {
    await unlink(abs);
  } catch {
    // arquivo já removido
  }
}

async function removeStoredItemImage(url: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    try {
      if (url.startsWith(PRIVATE_ITEM_IMAGE_PREFIX)) {
        await del(url.slice(PRIVATE_ITEM_IMAGE_PREFIX.length), { token });
        return;
      }
      if (isVercelBlobStorageUrl(url)) {
        await del(url, { token });
        return;
      }
    } catch {
      // blob já removido
    }
  }
  await removeLocalItemImageFile(url);
}

/** NF no Vercel Blob em pasta `invoices/` com acesso privado; sem token, grava em `public/uploads/invoices`. */
async function saveInvoice(file: File, maxSize: number): Promise<InvoiceSaveResult | null> {
  if (!file.size) {
    return null;
  }

  if (file.size > maxSize) {
    throw new Error(`O arquivo ${file.name} excede o limite permitido.`);
  }

  if (!INVOICE_TYPES.has(file.type)) {
    throw new Error("A nota fiscal precisa ser PDF, JPG, PNG ou WebP.");
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const rawExt = path.extname(file.name).toLowerCase();
    const allowedExt = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);
    const ext = allowedExt.has(rawExt) ? rawExt : ".pdf";
    const pathname = `invoices/${randomUUID()}${ext}`;
    const blob = await put(pathname, file, {
      access: "private",
      token,
      contentType: file.type || undefined,
    });
    return {
      fileName: safeFileName(file),
      url: blob.url,
    };
  }

  const local = await saveUpload(file, "invoices", maxSize);
  if (!local) {
    return null;
  }
  return {
    fileName: local.fileName,
    url: local.url,
  };
}

export async function createItem(formData: FormData) {
  const name = text(formData, "name");
  const categoryId = text(formData, "categoryId");
  const purchaseYear = numberValue(formData, "purchaseYear");

  if (!name || !categoryId || !purchaseYear) {
    throw new Error("Nome, categoria e ano de compra são obrigatórios.");
  }

  const condition = enumValue(
    formData.get("condition"),
    Object.values(ItemCondition),
    ItemCondition.GOOD,
  );
  const insuranceStatus = enumValue(
    formData.get("insuranceStatus"),
    Object.values(InsuranceStatus),
    InsuranceStatus.NOT_INSURED,
  );

  const invoice = formData.get("invoice");
  let invoiceUpload: InvoiceSaveResult | null = null;

  if (invoice instanceof File && invoice.size) {
    invoiceUpload = await saveInvoice(invoice, MAX_INVOICE_SIZE);
  }

  const imageUploads = [];
  for (const image of formData.getAll("images")) {
    if (!(image instanceof File) || !image.size) {
      continue;
    }

    const upload = await saveItemImage(image, MAX_IMAGE_SIZE);
    if (upload) {
      imageUploads.push(upload);
    }
  }

  await prisma.item.create({
    data: {
      name,
      description: text(formData, "description"),
      categoryId,
      brand: text(formData, "brand"),
      model: text(formData, "model"),
      serialNumber: text(formData, "serialNumber"),
      location: text(formData, "location"),
      purchaseYear,
      purchaseDate: dateValue(formData, "purchaseDate"),
      purchaseValue: purchaseValueFromForm(formData),
      supplier: text(formData, "supplier"),
      condition,
      insuranceStatus,
      insurancePolicy: text(formData, "insurancePolicy"),
      insuranceExpires: dateValue(formData, "insuranceExpires"),
      warrantyExpires: dateValue(formData, "warrantyExpires"),
      notes: text(formData, "notes"),
      invoiceFileName: invoiceUpload?.fileName,
      invoiceFileUrl: invoiceUpload?.url,
      images: {
        create: imageUploads.map((image) => ({
          fileName: image.fileName,
          url: image.url,
          alt: name,
        })),
      },
    },
  });

  revalidatePath("/");
  redirect("/");
}

export async function updateItem(formData: FormData) {
  const itemId = text(formData, "itemId");
  if (!itemId) {
    throw new Error("Item inválido.");
  }

  const existing = await prisma.item.findUnique({ where: { id: itemId } });
  if (!existing) {
    throw new Error("Item não encontrado.");
  }

  const name = text(formData, "name");
  const categoryId = text(formData, "categoryId");
  const purchaseYear = numberValue(formData, "purchaseYear");

  if (!name || !categoryId || !purchaseYear) {
    throw new Error("Nome, categoria e ano de compra são obrigatórios.");
  }

  const condition = enumValue(
    formData.get("condition"),
    Object.values(ItemCondition),
    ItemCondition.GOOD,
  );
  const insuranceStatus = enumValue(
    formData.get("insuranceStatus"),
    Object.values(InsuranceStatus),
    InsuranceStatus.NOT_INSURED,
  );

  const invoice = formData.get("invoice");
  let invoiceFileName = existing.invoiceFileName;
  let invoiceFileUrl = existing.invoiceFileUrl;
  let previousInvoiceUrlForCleanup: string | null | undefined;

  if (invoice instanceof File && invoice.size) {
    const invoiceUpload = await saveInvoice(invoice, MAX_INVOICE_SIZE);
    if (!invoiceUpload) {
      throw new Error("Falha ao salvar a nota fiscal.");
    }
    previousInvoiceUrlForCleanup = invoiceFileUrl;
    invoiceFileName = invoiceUpload.fileName;
    invoiceFileUrl = invoiceUpload.url;
  }

  const imageUploads = [];
  for (const image of formData.getAll("images")) {
    if (!(image instanceof File) || !image.size) {
      continue;
    }

    const upload = await saveItemImage(image, MAX_IMAGE_SIZE);
    if (upload) {
      imageUploads.push(upload);
    }
  }

  await prisma.item.update({
    where: { id: itemId },
    data: {
      name,
      description: text(formData, "description"),
      categoryId,
      brand: text(formData, "brand"),
      model: text(formData, "model"),
      serialNumber: text(formData, "serialNumber"),
      location: text(formData, "location"),
      purchaseYear,
      purchaseDate: dateValue(formData, "purchaseDate"),
      purchaseValue: purchaseValueFromForm(formData),
      supplier: text(formData, "supplier"),
      condition,
      insuranceStatus,
      insurancePolicy: text(formData, "insurancePolicy"),
      insuranceExpires: dateValue(formData, "insuranceExpires"),
      warrantyExpires: dateValue(formData, "warrantyExpires"),
      notes: text(formData, "notes"),
      invoiceFileName,
      invoiceFileUrl,
      ...(imageUploads.length
        ? {
            images: {
              create: imageUploads.map((image) => ({
                fileName: image.fileName,
                url: image.url,
                alt: name,
              })),
            },
          }
        : {}),
    },
  });

  if (
    invoice instanceof File &&
    invoice.size &&
    previousInvoiceUrlForCleanup &&
    previousInvoiceUrlForCleanup !== invoiceFileUrl
  ) {
    await deleteStoredInvoiceBlob(previousInvoiceUrlForCleanup);
    await removeLocalInvoiceFile(previousInvoiceUrlForCleanup);
  }

  revalidatePath("/");
  revalidatePath(`/items/${itemId}/edit`);
  redirect("/");
}

export async function deleteItemImage(formData: FormData) {
  const itemId = text(formData, "itemId");
  const imageId = text(formData, "imageId");
  if (!itemId || !imageId) {
    throw new Error("Dados inválidos.");
  }

  const image = await prisma.itemImage.findFirst({
    where: { id: imageId, itemId },
    select: { url: true },
  });
  if (!image) {
    throw new Error("Imagem não encontrada.");
  }

  await removeStoredItemImage(image.url);
  await prisma.itemImage.delete({ where: { id: imageId } });

  revalidatePath("/");
  revalidatePath(`/items/${itemId}/edit`);
  redirect(`/items/${itemId}/edit`);
}

export async function deleteItem(formData: FormData) {
  const itemId = text(formData, "itemId");
  if (!itemId) {
    throw new Error("Item inválido.");
  }

  const toRemove = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      invoiceFileUrl: true,
      images: { select: { url: true } },
    },
  });

  if (toRemove?.images?.length) {
    for (const img of toRemove.images) {
      await removeStoredItemImage(img.url);
    }
  }

  const invoiceUrl = toRemove?.invoiceFileUrl;
  await prisma.item.delete({ where: { id: itemId } });
  await deleteStoredInvoiceBlob(invoiceUrl);
  await removeLocalInvoiceFile(invoiceUrl);

  revalidatePath("/");
  redirect("/");
}

function normalizeHexColor(raw: string): string | null {
  const v = raw.trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
    return null;
  }
  if (v.length === 4) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return v.toLowerCase();
}

function colorFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }
  return normalizeHexColor(value);
}

export async function createCategory(formData: FormData) {
  const name = text(formData, "name");
  const color = colorFromForm(formData, "color");
  if (!name || !color) {
    throw new Error("Informe o nome e uma cor em formato hexadecimal (#RRGGBB ou #RGB).");
  }

  const taken = await prisma.category.findUnique({ where: { name } });
  if (taken) {
    throw new Error("Já existe uma categoria com esse nome.");
  }

  await prisma.category.create({ data: { name, color } });

  revalidatePath("/");
  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategory(formData: FormData) {
  const categoryId = text(formData, "categoryId");
  const name = text(formData, "name");
  const color = colorFromForm(formData, "color");
  if (!categoryId || !name || !color) {
    throw new Error("Nome, cor e categoria são obrigatórios.");
  }

  const existing = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!existing) {
    throw new Error("Categoria não encontrada.");
  }

  const nameTaken = await prisma.category.findFirst({
    where: { name, NOT: { id: categoryId } },
  });
  if (nameTaken) {
    throw new Error("Já existe outra categoria com esse nome.");
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { name, color },
  });

  revalidatePath("/");
  revalidatePath("/categories");
  redirect("/categories");
}

export async function deleteCategory(formData: FormData) {
  const categoryId = text(formData, "categoryId");
  if (!categoryId) {
    throw new Error("Categoria inválida.");
  }

  const row = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { items: true } } },
  });
  if (!row) {
    throw new Error("Categoria não encontrada.");
  }
  if (row._count.items > 0) {
    throw new Error(
      `Não é possível excluir: há ${row._count.items} item(ns) vinculado(s) a esta categoria.`,
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });

  revalidatePath("/");
  revalidatePath("/categories");
  redirect("/categories");
}
