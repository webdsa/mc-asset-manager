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
  Tags,
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

export default async function Home({ searchParams }: PageProps) {
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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Asset Manager</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">
                Inventário do estúdio
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/categories"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <Tags size={18} />
                Categorias
              </Link>
              <Link
                href="/items/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
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
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[96px_1.4fr_1fr_1fr_1fr_120px_88px] border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase text-slate-500 max-lg:hidden">
            <span>Imagem</span>
            <span>Item</span>
            <span>Categoria</span>
            <span>Local</span>
            <span>Seguro</span>
            <span>Compra</span>
            <span className="text-right">Ações</span>
          </div>

          {items.length ? (
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const image = item.images[0];
                const invoiceHref = itemInvoiceDownloadHref(item);

                return (
                  <article
                    key={item.id}
                    className="grid gap-4 px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[96px_1.4fr_1fr_1fr_1fr_120px_88px] lg:items-center"
                  >
                    <InventoryItemThumbnail itemId={item.id} itemName={item.name} image={image} />

                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-slate-950">
                        {item.name}
                      </h2>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {[item.brand, item.model, item.serialNumber].filter(Boolean).join(" • ") ||
                          "Sem marca/modelo informado"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock size={14} />
                          {formatCondition(item.condition)}
                        </span>
                        {invoiceHref ? (
                          <a
                            href={invoiceHref}
                            className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-950"
                            target="_blank"
                          >
                            <FileText size={14} />
                            Nota fiscal
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <span
                        className="inline-flex rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                        style={{ backgroundColor: item.category.color }}
                      >
                        {item.category.name}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={16} className="text-slate-400" />
                      {item.location || "Sem local"}
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

                    <div className="text-sm">
                      <p className="font-semibold text-slate-800">{item.purchaseYear}</p>
                      <p className="text-slate-500">
                        {formatCurrency(item.purchaseValue?.toString())}
                      </p>
                    </div>

                    <div className="flex justify-end lg:justify-end">
                      <InventoryItemActions itemId={item.id} itemName={item.name} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
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
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
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
