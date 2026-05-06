"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DEFAULT_PUBLIC_CATALOG_PAGE_SIZE,
  PUBLIC_CATALOG_PAGE_SIZES,
} from "@/lib/public-catalog-page-size";

const linkBase =
  "inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50";
const disabledBase =
  "inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-400 shadow-sm";

export type PublicCatalogQueryForPagination = {
  categoria?: string;
  q?: string;
  vista?: string;
  pageSize: number;
};

export type AdminInventoryQueryForPagination = {
  q?: string;
  category?: string;
  insurance?: string;
  vista?: string;
  pageSize: number;
  /** Modo dono: inventário só com itens excluídos / soft-deleted (`incluir_ocultos=1`). */
  onlyHidden?: boolean;
};

function catalogHref(query: PublicCatalogQueryForPagination, page: number): string {
  const p = new URLSearchParams();
  if (query.categoria) {
    p.set("categoria", query.categoria);
  }
  if (query.q) {
    p.set("q", query.q);
  }
  if (query.vista) {
    p.set("vista", query.vista);
  }
  if (query.pageSize !== DEFAULT_PUBLIC_CATALOG_PAGE_SIZE) {
    p.set("por_pagina", String(query.pageSize));
  }
  if (page > 1) {
    p.set("pagina", String(page));
  }
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

function adminInventoryHref(query: AdminInventoryQueryForPagination, page: number): string {
  const p = new URLSearchParams();
  if (query.q) {
    p.set("q", query.q);
  }
  if (query.category) {
    p.set("category", query.category);
  }
  if (query.insurance) {
    p.set("insurance", query.insurance);
  }
  if (query.vista) {
    p.set("vista", query.vista);
  }
  if (query.onlyHidden) {
    p.set("incluir_ocultos", "1");
  }
  if (query.pageSize !== DEFAULT_PUBLIC_CATALOG_PAGE_SIZE) {
    p.set("por_pagina", String(query.pageSize));
  }
  if (page > 1) {
    p.set("pagina", String(page));
  }
  const s = p.toString();
  return s ? `/admin?${s}` : "/admin";
}

type PublicCatalogPaginationProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
} & (
  | { scope?: "public"; query: PublicCatalogQueryForPagination }
  | { scope: "admin"; query: AdminInventoryQueryForPagination }
);

export function PublicCatalogPagination(props: PublicCatalogPaginationProps) {
  const { page, totalPages, totalCount, pageSize } = props;
  const scope = props.scope ?? "public";
  const query = props.query;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = scope === "admin" ? "/admin" : "/";

  const onPageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const n = parseInt(e.target.value, 10);
      const next = new URLSearchParams(searchParams?.toString());
      if (n === DEFAULT_PUBLIC_CATALOG_PAGE_SIZE) {
        next.delete("por_pagina");
      } else {
        next.set("por_pagina", String(n));
      }
      next.delete("pagina");
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: true });
    },
    [router, searchParams, pathname],
  );

  if (totalCount === 0) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const showPageControls = totalPages > 1;

  const gridClass = showPageControls
    ? "grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_10.5rem_minmax(0,auto)] lg:items-end lg:gap-x-6 xl:gap-x-8"
    : "grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_10.5rem] lg:items-end lg:gap-x-6 xl:gap-x-8";

  const paginationAria =
    scope === "admin"
      ? showPageControls
        ? "Paginação do inventário"
        : "Resumo do inventário"
      : showPageControls
        ? "Paginação do catálogo"
        : "Resumo do catálogo";

  const porPaginaId =
    scope === "admin" ? "admin-inventario-por-pagina" : "catalogo-por-pagina";

  const prevHref =
    scope === "admin"
      ? adminInventoryHref(query as AdminInventoryQueryForPagination, page - 1)
      : catalogHref(query as PublicCatalogQueryForPagination, page - 1);
  const nextHref =
    scope === "admin"
      ? adminInventoryHref(query as AdminInventoryQueryForPagination, page + 1)
      : catalogHref(query as PublicCatalogQueryForPagination, page + 1);

  return (
    <nav className="mt-8 border-t border-slate-200 pt-8" aria-label={paginationAria}>
      <div className={gridClass}>
        <p className="min-w-0 self-start text-sm leading-snug text-slate-600 lg:self-end">
          Mostrando{" "}
          <span className="font-medium text-slate-950">
            {start}–{end}
          </span>{" "}
          de <span className="font-medium text-slate-950">{totalCount}</span>
        </p>

        <div className="min-w-0 lg:w-full">
          <label className="block text-sm font-medium text-slate-700" htmlFor={porPaginaId}>
            Itens por página
          </label>
          <select
            id={porPaginaId}
            className="mt-1 min-h-11 w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-base shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 sm:max-w-none lg:w-full sm:text-sm"
            value={String(pageSize)}
            onChange={onPageSizeChange}
          >
            {PUBLIC_CATALOG_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {showPageControls ? (
          <div className="flex min-w-0 flex-nowrap items-center justify-start gap-1.5 sm:gap-2 lg:justify-end">
            {page <= 1 ? (
              <span className={disabledBase} aria-disabled="true">
                <ChevronLeft size={18} aria-hidden />
                Anterior
              </span>
            ) : (
              <Link href={prevHref} className={linkBase}>
                <ChevronLeft size={18} aria-hidden />
                Anterior
              </Link>
            )}
            <span className="shrink-0 whitespace-nowrap px-1.5 text-sm text-slate-600 sm:px-2">
              Página{" "}
              <span className="font-semibold text-slate-950">{page}</span>
              {" · "}
              {totalPages}
            </span>
            {page >= totalPages ? (
              <span className={disabledBase} aria-disabled="true">
                Seguinte
                <ChevronRight size={18} aria-hidden />
              </span>
            ) : (
              <Link href={nextHref} className={linkBase}>
                Seguinte
                <ChevronRight size={18} aria-hidden />
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
