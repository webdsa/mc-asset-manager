import Link from "next/link";
import { Suspense } from "react";
import { Boxes, MapPin, Tag } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCondition } from "@/lib/format";
import { PageHeader, pageMainInnerClass } from "@/components/page-header";
import { PublicCatalogFilter } from "@/app/public-catalog-filter";
import { PublicCatalogItemImage } from "@/app/public-catalog-item-image";
import { PublicCatalogViewToggle } from "@/app/public-catalog-view-toggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Catálogo público · Asset Manager",
  description: "Lista de itens publicados pelas categorias configuradas.",
};

type PageProps = {
  searchParams: Promise<{
    categoria?: string | string[];
    q?: string | string[];
    vista?: string | string[];
  }>;
};

function pickSearchParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function PublicCatalogHomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const categoryFilter = pickSearchParam(params.categoria);
  const textQuery = pickSearchParam(params.q);
  const isGrid = pickSearchParam(params.vista) === "grid";

  const publicCategories = await prisma.category.findMany({
    where: { isPublic: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });

  const categoryIds = publicCategories.map((c) => c.id);
  const filterOk =
    categoryFilter && categoryIds.includes(categoryFilter) ? categoryFilter : undefined;

  const itemWhere: Prisma.ItemWhereInput = {
    categoryId: filterOk ? filterOk : { in: categoryIds },
    ...(textQuery
      ? {
          OR: [
            { name: { contains: textQuery, mode: "insensitive" } },
            { brand: { contains: textQuery, mode: "insensitive" } },
            { model: { contains: textQuery, mode: "insensitive" } },
            { description: { contains: textQuery, mode: "insensitive" } },
            { location: { contains: textQuery, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const items =
    publicCategories.length === 0
      ? []
      : await prisma.item.findMany({
          where: itemWhere,
          include: {
            category: true,
            images: { orderBy: { createdAt: "asc" } },
          },
          orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
        });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <PageHeader>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Catálogo público</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">
              Asset Manager
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Esta página mostra apenas itens de categorias marcadas como públicas pelos
              administradores. Não são exibidos valores, números de série nem documentos.
            </p>
          </div>
          {publicCategories.length > 0 ? (
            <Suspense
              fallback={
                <div className="h-24 w-full max-w-4xl animate-pulse rounded-md bg-slate-100/80" />
              }
            >
              <PublicCatalogFilter
                categories={publicCategories.map((c) => ({ id: c.id, name: c.name }))}
                selectedId={filterOk ?? ""}
                initialQuery={textQuery ?? ""}
                viewToggle={<PublicCatalogViewToggle />}
              />
            </Suspense>
          ) : null}
        </div>
      </PageHeader>

      <section className={`${pageMainInnerClass} pb-16 pt-2`}>
        {publicCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <Boxes className="mx-auto text-slate-300" size={36} />
            <h2 className="mt-3 text-lg font-semibold text-slate-950">
              Nenhuma categoria pública
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Quando um administrador publicar categorias, os itens aparecerão aqui.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <Tag className="mx-auto text-slate-300" size={36} />
            <h2 className="mt-3 text-lg font-semibold text-slate-950">
              {textQuery
                ? "Nenhum item corresponde à pesquisa"
                : "Nenhum item nesta seleção"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {textQuery
                ? "Tente outras palavras ou limpe a busca. A pesquisa aplica-se só às categorias públicas."
                : "Ajuste o filtro de categoria ou adicione itens às categorias públicas."}
            </p>
          </div>
        ) : isGrid ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const galleryImages = item.images.map((img) => ({
                id: img.id,
                url: img.url,
                alt: img.alt,
                fileName: img.fileName,
              }));
              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-petroleum-900/12 bg-white shadow-sm transition hover:shadow-md"
                >
                  <PublicCatalogItemImage
                    itemId={item.id}
                    itemName={item.name}
                    images={galleryImages}
                    variant="grid"
                  />
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <span
                      className="inline-flex w-fit max-w-full rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: item.category.color }}
                    >
                      <span className="truncate">{item.category.name}</span>
                    </span>
                    <h2 className="text-base font-semibold leading-snug text-slate-950">
                      <span className="line-clamp-2">{item.name}</span>
                    </h2>
                    <p className="text-sm leading-snug text-slate-500">
                      <span className="line-clamp-2">
                        {[item.brand, item.model].filter(Boolean).join(" • ") ||
                          "Sem marca/modelo informado"}
                      </span>
                    </p>
                    {item.description ? (
                      <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p>
                    ) : null}
                    <div className="mt-auto border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>{formatCondition(item.condition)}</span>
                    </div>
                    <div className="inline-flex items-start gap-2 text-sm text-slate-600">
                      <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                      <span className="min-w-0 break-words leading-snug">
                        {item.location || "—"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:gap-0 lg:divide-y lg:divide-slate-100 lg:overflow-hidden lg:rounded-md lg:border lg:border-petroleum-900/12 lg:bg-white lg:shadow-sm">
            <div className="hidden grid-cols-[96px_1.4fr_1fr_1fr] border-b border-petroleum-900/10 bg-slate-100/80 px-4 py-3 text-xs font-semibold uppercase text-petroleum-700 lg:grid">
              <span>Foto</span>
              <span>Item</span>
              <span>Categoria</span>
              <span>Local</span>
            </div>
            {items.map((item) => {
              const galleryImages = item.images.map((img) => ({
                id: img.id,
                url: img.url,
                alt: img.alt,
                fileName: img.fileName,
              }));

              return (
                <article
                  key={item.id}
                  className="
                    grid gap-x-3 gap-y-2 px-4 py-4 transition
                    max-lg:grid-cols-[6.75rem_1fr]
                    max-lg:rounded-xl max-lg:border max-lg:border-slate-200 max-lg:bg-white max-lg:shadow-sm
                    lg:grid-cols-[96px_minmax(0,1.4fr)_1fr_1fr]
                    lg:items-center lg:gap-4
                    hover:bg-petroleum-800/5 max-lg:hover:bg-petroleum-800/5
                  "
                >
                  <PublicCatalogItemImage
                    itemId={item.id}
                    itemName={item.name}
                    images={galleryImages}
                    variant="list"
                  />

                  <div className="min-w-0 lg:col-start-2">
                    <h2 className="text-base font-semibold leading-snug text-slate-950">
                      <span className="line-clamp-2 lg:truncate">{item.name}</span>
                    </h2>
                    <p className="mt-1 text-sm leading-snug text-slate-500">
                      <span className="line-clamp-2 lg:truncate">
                        {[item.brand, item.model].filter(Boolean).join(" • ") ||
                          "Sem marca/modelo informado"}
                      </span>
                    </p>
                    {item.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.description}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">{formatCondition(item.condition)}</p>
                  </div>

                  <div className="min-w-0 max-lg:col-span-2 lg:col-start-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                      Categoria
                    </p>
                    <span
                      className="inline-flex max-w-full rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: item.category.color }}
                    >
                      <span className="truncate">{item.category.name}</span>
                    </span>
                  </div>

                  <div className="min-w-0 max-lg:col-span-2 lg:col-start-4">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                      Local
                    </p>
                    <div className="inline-flex min-h-9 max-w-full items-start gap-2 text-sm text-slate-600">
                      <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                      <span className="min-w-0 break-words leading-snug">
                        {item.location || "—"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          <Link href="/login" className="font-medium text-petroleum-800 hover:text-primary">
            Entrar no Asset Manager
          </Link>
          {" · "}
          Catálogo apenas informativo.
        </p>
      </section>
    </main>
  );
}
