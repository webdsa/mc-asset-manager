import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Boxes,
  CalendarClock,
  FileText,
  MapPin,
  PackagePlus,
  ShieldCheck,
} from "lucide-react";
import { InsuranceStatus, Prisma } from "@/generated/prisma/client";
import {
  formatCondition,
  formatCurrency,
  formatDate,
  formatInsuranceStatus,
} from "@/lib/format";
import { itemInvoiceDownloadHref } from "@/lib/invoice";
import { prisma } from "@/lib/prisma";
import { itemIdsMatchingPatrimonyCode } from "@/lib/item-patrimony-search";
import { isAppOwnerUser } from "@/lib/app-owner";
import { getAppUser } from "@/lib/auth-user";
import { AdminIncludeHiddenToggle } from "@/app/admin-include-hidden-toggle";
import { AdminInventoryViewToggle } from "@/app/admin-inventory-view-toggle";
import { InventoryFilterForm } from "@/app/inventory-filter-form";
import { InventoryItemActions } from "@/app/inventory-item-actions";
import { InventoryItemThumbnail } from "@/app/inventory-item-thumbnail";
import { PublicCatalogPagination } from "@/app/public-catalog-pagination";
import { PageHeader, pageMainInnerClass } from "@/components/page-header";
import { parsePublicCatalogPageSizeParam } from "@/lib/public-catalog-page-size";
import { serializeAdminItem } from "@/lib/admin-serialized-item";
import {
  AdminInventoryCardOpener,
  AdminItemModalProvider,
} from "@/app/admin-item-modal-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    insurance?: string | string[];
    vista?: string | string[];
    pagina?: string | string[];
    por_pagina?: string | string[];
    incluir_ocultos?: string | string[];
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

function parsePagina(value: string | string[] | undefined): number {
  const raw = pickSearchParam(value);
  if (!raw) {
    return 1;
  }
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.floor(n);
}

const insuranceTone: Record<string, string> = {
  INSURED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  EXPIRED: "border-rose-200 bg-rose-50 text-rose-700",
  NOT_INSURED: "border-slate-200 bg-slate-100 text-slate-600",
};

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const appUser = await getAppUser();
  const isOwner = appUser ? isAppOwnerUser(appUser) : false;
  const showOnlyHiddenItems =
    isOwner && pickSearchParam(params.incluir_ocultos) === "1";

  const query = pickSearchParam(params.q);
  const category = pickSearchParam(params.category);
  const insurance = pickSearchParam(params.insurance);
  const isGrid = pickSearchParam(params.vista) !== "list";
  const pageSize = parsePublicCatalogPageSizeParam(pickSearchParam(params.por_pagina));

  const identifierCodeIds = query
    ? await itemIdsMatchingPatrimonyCode(
        prisma,
        query,
        showOnlyHiddenItems ? "hidden" : "visible",
      )
    : [];

  const where: Prisma.ItemWhereInput = {
    ...(showOnlyHiddenItems ? { hiddenAt: { not: null } } : { hiddenAt: null }),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
            { model: { contains: query, mode: "insensitive" } },
            { serialNumber: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { category: { name: { contains: query, mode: "insensitive" } } },
            ...(identifierCodeIds.length > 0 ? [{ id: { in: identifierCodeIds } }] : []),
          ],
        }
      : {}),
    ...(category ? { categoryId: category } : {}),
    ...(insurance && Object.values(InsuranceStatus).includes(insurance as InsuranceStatus)
      ? { insuranceStatus: insurance as InsuranceStatus }
      : {}),
  };

  const attentionWhere: Prisma.ItemWhereInput = {
    OR: [
      { insuranceStatus: InsuranceStatus.EXPIRED },
      { insuranceStatus: InsuranceStatus.PENDING },
      { condition: "NEEDS_REPAIR" },
    ],
  };

  const [categories, totalItems, insuredItems, attentionItems, totalValue] =
    await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.item.count({ where }),
      prisma.item.count({
        where: { ...where, insuranceStatus: InsuranceStatus.INSURED },
      }),
      prisma.item.count({
        where: { AND: [where, attentionWhere] },
      }),
      prisma.item.aggregate({
        where,
        _sum: { purchaseValue: true },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const requestedPage = parsePagina(params.pagina);
  const page = Math.min(requestedPage, totalPages);

  const items =
    totalItems === 0
      ? []
      : await prisma.item.findMany({
          where,
          include: {
            category: true,
            images: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { name: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        });

  const insuranceFilterOk =
    insurance && Object.values(InsuranceStatus).includes(insurance as InsuranceStatus)
      ? insurance
      : undefined;

  return (
    <main className="min-h-screen bg-background text-slate-950">
      <PageHeader innerClassName="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Asset Manager</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">
                Inventário de assets
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/items/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
              >
                <PackagePlus size={18} />
                Novo item
              </Link>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="min-h-[5.5rem] w-full max-w-5xl animate-pulse rounded-md bg-muted/50" />
            }
          >
            <InventoryFilterForm
              query={query ?? ""}
              category={category ?? ""}
              insurance={insurance ?? ""}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              preserveListView={!isGrid}
              preserveIncludeHidden={showOnlyHiddenItems}
              viewToggle={
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end md:gap-4">
                  {isOwner ? <AdminIncludeHiddenToggle /> : null}
                  <AdminInventoryViewToggle />
                </div>
              }
            />
          </Suspense>
      </PageHeader>

      <section className={pageMainInnerClass}>
        <div className="hidden gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-4">
          <Metric icon={<Boxes size={20} />} label="Itens cadastrados" value={totalItems} />
          <Metric
            icon={<ShieldCheck size={20} />}
            label="Com seguro ativo"
            value={insuredItems}
          />
          <Metric
            icon={<AlertTriangle size={20} />}
            label="Precisam atenção"
            value={attentionItems}
          />
          <Metric
            icon={<BadgeCheck size={20} />}
            label="Valor declarado"
            value={formatCurrency(totalValue._sum.purchaseValue?.toString())}
          />
        </div>

        <AdminItemModalProvider>
          <div className="mt-6">
          {items.length ? (
            isGrid ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => {
                  const serialized = serializeAdminItem(item);
                  const invoiceHref = itemInvoiceDownloadHref(item);
                  return (
                    <AdminInventoryCardOpener key={item.id} item={serialized}>
                    <article
                      tabIndex={0}
                      className="flex flex-col overflow-hidden rounded-xl border border-petroleum-900/12 bg-white shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/35 cursor-pointer"
                    >
                      <div data-modal-ignore className="relative shrink-0">
                      <InventoryItemThumbnail
                        itemId={item.id}
                        itemName={item.name}
                        images={item.images}
                        layout="cover"
                        className="rounded-none rounded-t-xl"
                      />
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="inline-flex w-fit max-w-full rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                            style={{ backgroundColor: item.category.color }}
                          >
                            <span className="truncate">{item.category.name}</span>
                          </span>
                          {item.hiddenAt ? (
                            <ExcludedItemBadge hiddenAt={item.hiddenAt} />
                          ) : null}
                        </div>
                        <h2 className="text-base font-semibold leading-snug text-slate-950">
                          <span className="line-clamp-2">{item.name}</span>
                        </h2>
                        <p className="text-sm leading-snug text-slate-500">
                          <span className="line-clamp-2">
                            {[item.brand, item.model, item.serialNumber, item.patrimonyCode, item.qrCode]
                              .filter(Boolean)
                              .join(" • ") || "Sem marca/modelo informado"}
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock size={14} className="shrink-0" />
                            {formatCondition(item.condition)}
                          </span>
                          {invoiceHref ? (
                            <a
                              href={invoiceHref}
                              data-modal-ignore
                              className="inline-flex min-h-9 items-center gap-1 font-medium text-petroleum-800 touch-manipulation hover:text-primary"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileText size={14} className="shrink-0" />
                              Nota fiscal
                            </a>
                          ) : null}
                        </div>
                        <div>
                          <span
                            className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${
                              insuranceTone[item.insuranceStatus]
                            }`}
                          >
                            {formatInsuranceStatus(item.insuranceStatus)}
                          </span>
                          {item.insuranceExpires ? (
                            <p className="mt-1 text-xs text-slate-500">
                              até {formatDate(item.insuranceExpires)}
                            </p>
                          ) : null}
                        </div>
                        <div className="inline-flex items-start gap-2 text-sm text-slate-600">
                          <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                          <span className="min-w-0 break-words leading-snug">
                            {item.location || "Sem local"}
                          </span>
                        </div>
                        <div className="text-sm">
                          <p className="font-semibold text-slate-800">{item.purchaseYear}</p>
                          <p className="text-slate-500">
                            {formatCurrency(item.purchaseValue?.toString())}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">Qtd. {item.quantity}</p>
                        </div>
                        <div data-modal-ignore className="mt-auto flex justify-end border-t border-slate-100 pt-3">
                          <InventoryItemActions
                            itemId={item.id}
                            itemName={item.name}
                            excludedAt={item.hiddenAt}
                            showRestore={showOnlyHiddenItems}
                          />
                        </div>
                      </div>
                    </article>
                    </AdminInventoryCardOpener>
                  );
                })}
              </div>
            ) : (
              <div className="lg:overflow-hidden lg:rounded-md lg:border lg:border-petroleum-900/12 lg:bg-white lg:shadow-sm">
                <div className="grid grid-cols-[96px_1.4fr_1fr_1fr_1fr_120px_88px] border-b border-petroleum-900/10 bg-slate-100/80 px-4 py-3 text-xs font-semibold uppercase text-petroleum-700 max-lg:hidden">
                  <span>Imagem</span>
                  <span>Item</span>
                  <span>Categoria</span>
                  <span>Local</span>
                  <span>Seguro</span>
                  <span>Compra</span>
                  <span className="text-right">Ações</span>
                </div>

                <div className="flex flex-col gap-3 lg:gap-0 lg:divide-y lg:divide-slate-100">
                  {items.map((item) => {
                    const serialized = serializeAdminItem(item);
                    const invoiceHref = itemInvoiceDownloadHref(item);

                    return (
                      <AdminInventoryCardOpener key={item.id} item={serialized}>
                      <article
                        tabIndex={0}
                        className="
                      grid gap-x-3 gap-y-2 px-4 py-4 transition
                      max-lg:grid-cols-[6.75rem_1fr_auto]
                      max-lg:grid-rows-[auto_auto]
                      max-lg:rounded-xl max-lg:border max-lg:border-slate-200 max-lg:bg-white max-lg:shadow-sm
                      lg:grid-cols-[96px_minmax(0,1.4fr)_1fr_1fr_1fr_120px_88px]
                      lg:items-center lg:gap-4 lg:rounded-none lg:border-0 lg:shadow-none
                      hover:bg-petroleum-800/5 max-lg:hover:bg-petroleum-800/5
                      cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/35
                    "
                      >
                        <div
                          data-modal-ignore
                          className="max-lg:col-start-1 max-lg:row-span-2 max-lg:row-start-1 max-lg:self-start lg:col-start-1 lg:row-start-1"
                        >
                          <InventoryItemThumbnail
                            itemId={item.id}
                            itemName={item.name}
                            images={item.images}
                            className="max-lg:h-[6.75rem] max-lg:w-[6.75rem] max-lg:rounded-lg"
                          />
                        </div>

                        <div className="min-w-0 max-lg:col-start-2 max-lg:row-start-1 lg:col-start-2 lg:row-start-1">
                          <h2 className="text-base font-semibold leading-snug text-slate-950">
                            <span className="line-clamp-2 lg:truncate">{item.name}</span>
                          </h2>
                          {item.hiddenAt ? (
                            <div className="mt-1.5">
                              <ExcludedItemBadge hiddenAt={item.hiddenAt} />
                            </div>
                          ) : null}
                          <p className="mt-1 text-sm leading-snug text-slate-500">
                            <span className="line-clamp-2 lg:truncate">
                              {[item.brand, item.model, item.serialNumber, item.patrimonyCode, item.qrCode]
                                .filter(Boolean)
                                .join(" • ") || "Sem marca/modelo informado"}
                            </span>
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock size={14} className="shrink-0" />
                              {formatCondition(item.condition)}
                            </span>
                            {invoiceHref ? (
                              <a
                                href={invoiceHref}
                                data-modal-ignore
                                className="inline-flex min-h-9 items-center gap-1 font-medium text-petroleum-800 touch-manipulation hover:text-primary"
                                target="_blank"
                                rel="noreferrer"
                              >
                                <FileText size={14} className="shrink-0" />
                                Nota fiscal
                              </a>
                            ) : null}
                          </div>
                        </div>

                        <div
                          data-modal-ignore
                          className="max-lg:col-start-3 max-lg:row-start-1 max-lg:self-start lg:col-start-7 lg:row-start-1 lg:flex lg:justify-end"
                        >
                          <InventoryItemActions
                            itemId={item.id}
                            itemName={item.name}
                            excludedAt={item.hiddenAt}
                            showRestore={showOnlyHiddenItems}
                          />
                        </div>

                        <div className="max-lg:col-span-2 max-lg:col-start-2 max-lg:row-start-2 max-lg:flex max-lg:min-w-0 max-lg:items-start max-lg:gap-2 lg:contents">
                          <div className="min-w-0 flex-1 lg:col-start-3 lg:row-start-1">
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

                          <div className="min-w-0 flex-1 lg:col-start-5 lg:row-start-1">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                              Seguro
                            </p>
                            <span
                              className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${
                                insuranceTone[item.insuranceStatus]
                              }`}
                            >
                              {formatInsuranceStatus(item.insuranceStatus)}
                            </span>
                            {item.insuranceExpires ? (
                              <p className="mt-1 text-xs text-slate-500">
                                até {formatDate(item.insuranceExpires)}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="hidden min-w-0 lg:block lg:col-start-4 lg:row-start-1">
                          <div className="inline-flex min-h-9 max-w-full items-start gap-2 text-sm text-slate-600">
                            <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                            <span className="min-w-0 break-words leading-snug">
                              {item.location || "Sem local"}
                            </span>
                          </div>
                        </div>

                        <div className="hidden lg:block lg:col-start-6 lg:row-start-1 lg:text-left">
                          <div className="text-sm">
                            <p className="font-semibold text-slate-800">{item.purchaseYear}</p>
                            <p className="text-slate-500">
                              {formatCurrency(item.purchaseValue?.toString())}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">Qtd. {item.quantity}</p>
                          </div>
                        </div>
                      </article>
                      </AdminInventoryCardOpener>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center lg:rounded-none lg:border-0 lg:bg-transparent">
              <Boxes className="mx-auto text-slate-300" size={36} />
              <h2 className="mt-3 text-lg font-semibold text-slate-950">
                Nenhum item encontrado
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ajuste os filtros ou cadastre o primeiro ativo do estúdio.
              </p>
            </div>
          )}
        </div>
        </AdminItemModalProvider>

        <PublicCatalogPagination
          scope="admin"
          page={page}
          totalPages={totalPages}
          totalCount={totalItems}
          pageSize={pageSize}
          query={{
            q: query,
            category,
            insurance: insuranceFilterOk,
            vista: isGrid ? undefined : "list",
            pageSize,
            onlyHidden: showOnlyHiddenItems,
          }}
        />
      </section>
    </main>
  );
}

function ExcludedItemBadge({ hiddenAt }: { hiddenAt: Date }) {
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="inline-flex shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800">
        Excluído
      </span>
      <span className="text-xs text-slate-500">{formatDate(hiddenAt)}</span>
    </span>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-petroleum-900/10 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-petroleum-800/10 text-petroleum-800">
          {icon}
        </span>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}
