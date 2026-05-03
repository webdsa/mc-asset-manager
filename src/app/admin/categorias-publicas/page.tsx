import Link from "next/link";
import { ArrowLeft, Globe } from "lucide-react";
import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth-user";
import { isStaffRole } from "@/lib/staff-role";
import { prisma } from "@/lib/prisma";
import { PageHeader, pageMainInnerClass } from "@/components/page-header";
import { CategoryPublicToggle } from "@/app/admin/categorias-publicas/category-public-toggle";
import { setCategoryIsPublicAction } from "@/app/admin/categorias-publicas/actions";

export const dynamic = "force-dynamic";

export default async function AdminPublicCategoriesPage() {
  const viewer = await getAppUser();
  if (!viewer || !isStaffRole(viewer.role)) {
    redirect("/admin");
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <main className="min-h-screen bg-background text-slate-950">
      <PageHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm font-medium text-petroleum-800 hover:text-primary"
            >
              <ArrowLeft size={16} />
              Inventário
            </Link>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Globe className="text-slate-600" size={28} />
              Catálogo público
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Escolha quais categorias aparecem na página inicial pública{" "}
              <Link
                href="/"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                /
              </Link>
              . Apenas administradores e o dono da app podem alterar estas opções.
            </p>
          </div>
        </div>
      </PageHeader>

      <div className={`${pageMainInnerClass} pb-8 pt-2`}>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Categoria</th>
                <th className="hidden px-4 py-3 sm:table-cell">Itens</th>
                <th className="px-4 py-3 text-right">Público</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-4">
                    <span
                      className="inline-flex max-w-full items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      <span className="truncate">{c.name}</span>
                    </span>
                  </td>
                  <td className="hidden px-4 py-4 text-slate-600 sm:table-cell">
                    {c._count.items}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end">
                      <CategoryPublicToggle
                        categoryId={c.id}
                        initialIsPublic={c.isPublic}
                        setCategoryIsPublicAction={setCategoryIsPublicAction}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Ainda não há categorias. Crie categorias em{" "}
              <Link href="/categories" className="font-medium text-primary hover:underline">
                Categorias
              </Link>
              .
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
