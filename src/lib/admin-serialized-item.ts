import type { Category, Item, ItemImage } from "@/generated/prisma/client";
import { itemInvoiceDownloadHref } from "@/lib/invoice";

/** Payload JSON-safe para o modal de detalhes do inventário admin. */
export type AdminSerializedItem = {
  id: string;
  name: string;
  description: string | null;
  category: { name: string; color: string };
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  patrimonyCode: string | null;
  qrCode: string | null;
  quantity: number;
  location: string | null;
  purchaseYear: number;
  purchaseDate: string | null;
  purchaseValue: string | null;
  supplier: string | null;
  condition: string;
  insuranceStatus: string;
  insuranceCompany: string | null;
  insurancePolicy: string | null;
  insuranceExpires: string | null;
  warrantyExpires: string | null;
  notes: string | null;
  invoiceHref: string | null;
  hiddenAt: string | null;
  images: Pick<ItemImage, "id" | "url" | "alt" | "fileName">[];
};

export function serializeAdminItem(
  item: Item & { category: Category; images: ItemImage[] },
): AdminSerializedItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: { name: item.category.name, color: item.category.color },
    brand: item.brand,
    model: item.model,
    serialNumber: item.serialNumber,
    patrimonyCode: item.patrimonyCode,
    qrCode: item.qrCode,
    quantity: item.quantity,
    location: item.location,
    purchaseYear: item.purchaseYear,
    purchaseDate: item.purchaseDate?.toISOString() ?? null,
    purchaseValue: item.purchaseValue != null ? item.purchaseValue.toString() : null,
    supplier: item.supplier,
    condition: item.condition,
    insuranceStatus: item.insuranceStatus,
    insuranceCompany: item.insuranceCompany,
    insurancePolicy: item.insurancePolicy,
    insuranceExpires: item.insuranceExpires?.toISOString() ?? null,
    warrantyExpires: item.warrantyExpires?.toISOString() ?? null,
    notes: item.notes,
    invoiceHref: itemInvoiceDownloadHref(item),
    hiddenAt: item.hiddenAt?.toISOString() ?? null,
    images: item.images.map((i) => ({
      id: i.id,
      url: i.url,
      alt: i.alt,
      fileName: i.fileName,
    })),
  };
}
