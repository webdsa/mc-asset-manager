import { prisma } from "@/lib/prisma";
import { CategoriesPanel } from "@/app/categories/categories-panel";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <CategoriesPanel
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        itemCount: c._count.items,
      }))}
    />
  );
}
