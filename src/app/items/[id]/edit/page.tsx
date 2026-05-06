import { notFound } from "next/navigation";
import { Suspense } from "react";
import { updateItem } from "@/app/actions";
import {
  ItemForm,
  itemFormContainerClassName,
  type ItemFormInitial,
} from "@/app/items/item-form";
import { ItemAuditHistory } from "@/components/item-audit-history";
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
    qrCode: item.qrCode,
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
    <div className="space-y-10 pb-10">
      <ItemForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        action={updateItem}
        submitLabel="Atualizar item"
        initial={initial}
        headingEyebrow="Editar ativo"
        headingTitle={item.name}
      />
      <div className={itemFormContainerClassName}>
        <Suspense
          fallback={
            <p className="text-sm text-slate-500" aria-live="polite">
              A carregar histórico…
            </p>
          }
        >
          <ItemAuditHistory itemId={id} />
        </Suspense>
      </div>
    </div>
  );
}
