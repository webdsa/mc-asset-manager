import { createItem } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "@/app/items/item-form";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <ItemForm
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      action={createItem}
      submitLabel="Salvar item"
      headingEyebrow="Novo ativo"
      headingTitle="Cadastro de item do estúdio"
    />
  );
}
