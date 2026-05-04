import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const linkBase =
  "inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50";
const disabledBase =
  "inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-400 shadow-sm";

export type PublicCatalogQueryForPagination = {
  categoria?: string;
  q?: string;
  vista?: string;
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
  if (page > 1) {
    p.set("pagina", String(page));
  }
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

export function PublicCatalogPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  query,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  query: PublicCatalogQueryForPagination;
}) {
  if (totalCount === 0) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const showPageControls = totalPages > 1;

  return (
    <nav
      className={
        showPageControls
          ? "mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row"
          : "mt-8 flex justify-center border-t border-slate-200 pt-8"
      }
      aria-label={showPageControls ? "Paginação do catálogo" : "Resumo do catálogo"}
    >
      <p className="text-sm text-slate-600">
        Mostrando{" "}
        <span className="font-medium text-slate-950">
          {start}–{end}
        </span>{" "}
        de <span className="font-medium text-slate-950">{totalCount}</span>
      </p>
      {showPageControls ? (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {page <= 1 ? (
          <span className={disabledBase} aria-disabled="true">
            <ChevronLeft size={18} aria-hidden />
            Anterior
          </span>
        ) : (
          <Link href={catalogHref(query, page - 1)} className={linkBase} scroll={false}>
            <ChevronLeft size={18} aria-hidden />
            Anterior
          </Link>
        )}
        <span className="px-2 text-sm text-slate-600">
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
          <Link href={catalogHref(query, page + 1)} className={linkBase} scroll={false}>
            Seguinte
            <ChevronRight size={18} aria-hidden />
          </Link>
        )}
      </div>
      ) : null}
    </nav>
  );
}
