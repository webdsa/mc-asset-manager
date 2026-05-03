import Link from "next/link";
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
import { InventoryFilterForm } from "@/app/inventory-filter-form";
import { InventoryItemActions } from "@/app/inventory-item-actions";
import { InventoryItemThumbnail } from "@/app/inventory-item-thumbnail";
import { PageHeader, pageMainInnerClass } from "@/components/page-header";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    insurance?: string | string[];
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

const insuranceTone: Record<string, string> = {
  INSURED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  EXPIRED: "border-rose-200 bg-rose-50 text-rose-700",
  NOT_INSURED: "border-slate-200 bg-slate-100 text-slate-600",
};

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = pickSearchParam(params.q);
  const category = pickSearchParam(params.category);
  const insurance = pickSearchParam(params.insurance);

  const where: Prisma.ItemWhereInput = {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
            { model: { contains: query, mode: "insensitive" } },
            { serialNumber: { contains: query, mode: "insensitive" } },
            { location: { contains: query, mode: "insensitive" } },
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

  const [items, categories, totalItems, insuredItems, attentionItems, totalValue] =
    await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          category: true,
          images: { orderBy: { createdAt: "asc" }, take: 1 },
        },
        orderBy: { updatedAt: "desc" },
      }),
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

          <InventoryFilterForm
            query={query ?? ""}
            category={category ?? ""}
            insurance={insurance ?? ""}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          />
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

        <div className="mt-6 lg:overflow-hidden lg:rounded-md lg:border lg:border-petroleum-900/12 lg:bg-white lg:shadow-sm">
          <div className="grid grid-cols-[96px_1.4fr_1fr_1fr_1fr_120px_88px] border-b border-petroleum-900/10 bg-slate-100/80 px-4 py-3 text-xs font-semibold uppercase text-petroleum-700 max-lg:hidden">
            <span>Imagem</span>
            <span>Item</span>
            <span>Categoria</span>
            <span>Local</span>
            <span>Seguro</span>
            <span>Compra</span>
            <span className="text-right">Ações</span>
          </div>

          {items.length ? (
            <div className="flex flex-col gap-3 lg:gap-0 lg:divide-y lg:divide-slate-100">
              {items.map((item) => {
                const image = item.images[0];
                const invoiceHref = itemInvoiceDownloadHref(item);

                return (
                  <article
                    key={item.id}
                    className="
                      grid gap-x-3 gap-y-2 px-4 py-4 transition
                      max-lg:grid-cols-[6.75rem_1fr_auto]
                      max-lg:grid-rows-[auto_auto]
                      max-lg:rounded-xl max-lg:border max-lg:border-slate-200 max-lg:bg-white max-lg:shadow-sm
                      lg:grid-cols-[96px_minmax(0,1.4fr)_1fr_1fr_1fr_120px_88px]
                      lg:items-center lg:gap-4 lg:rounded-none lg:border-0 lg:shadow-none
                      hover:bg-petroleum-800/5 max-lg:hover:bg-petroleum-800/5
                    "
                  >
                    <div className="max-lg:col-start-1 max-lg:row-span-2 max-lg:row-start-1 max-lg:self-start lg:col-start-1 lg:row-start-1">
                      <InventoryItemThumbnail
                        itemId={item.id}
                        itemName={item.name}
                        image={image}
                        className="max-lg:h-[6.75rem] max-lg:w-[6.75rem] max-lg:rounded-lg"
                      />
                    </div>

                    <div className="min-w-0 max-lg:col-start-2 max-lg:row-start-1 lg:col-start-2 lg:row-start-1">
                      <h2 className="text-base font-semibold leading-snug text-slate-950">
                        <span className="line-clamp-2 lg:truncate">{item.name}</span>
                      </h2>
                      <p className="mt-1 text-sm leading-snug text-slate-500">
                        <span className="line-clamp-2 lg:truncate">
                          {[item.brand, item.model, item.serialNumber].filter(Boolean).join(" • ") ||
                            "Sem marca/modelo informado"}
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

                    <div className="max-lg:col-start-3 max-lg:row-start-1 max-lg:self-start lg:col-start-7 lg:row-start-1 lg:flex lg:justify-end">
                      <InventoryItemActions itemId={item.id} itemName={item.name} />
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
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
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
      </section>
    </main>
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
