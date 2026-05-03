import { notFound } from "next/navigation";
import { updateItem } from "@/app/actions";
import { ItemForm, type ItemFormInitial } from "@/app/items/item-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditItemPage({ params }: PageProps) {
  const { id } = await params;

  const [item, categories] = await Promise.all([
    prisma.item.findUnique({
      where: { id },
      include: { images: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!item) {
    notFound();
  }

  const initial: ItemFormInitial = {
    id: item.id,
    name: item.name,
    description: item.description,
    categoryId: item.categoryId,
    brand: item.brand,
    model: item.model,
    serialNumber: item.serialNumber,
    patrimonyCode: item.patrimonyCode,
    quantity: item.quantity,
    location: item.location,
    purchaseYear: item.purchaseYear,
    purchaseDate: item.purchaseDate,
    purchaseValue: item.purchaseValue,
    supplier: item.supplier,
    condition: item.condition,
    insuranceStatus: item.insuranceStatus,
    insurancePolicy: item.insurancePolicy,
    insuranceExpires: item.insuranceExpires,
    warrantyExpires: item.warrantyExpires,
    notes: item.notes,
    invoiceFileUrl: item.invoiceFileUrl,
    images: item.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      fileName: img.fileName,
    })),
  };

  return (
    <ItemForm
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      action={updateItem}
      submitLabel="Atualizar item"
      initial={initial}
      headingEyebrow="Editar ativo"
      headingTitle={item.name}
    />
  );
}
