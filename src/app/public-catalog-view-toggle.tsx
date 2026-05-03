"use client";

import { LayoutGrid, LayoutList } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function PublicCatalogViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGrid = searchParams.get("vista") === "grid";

  const setMode = useCallback(
    (grid: boolean) => {
      const next = new URLSearchParams(searchParams?.toString());
      if (grid) {
        next.set("vista", "grid");
      } else {
        next.delete("vista");
      }
      const qs = next.toString();
      router.push(qs ? `/?${qs}` : "/");
    },
    [router, searchParams],
  );

  const btnClass = (active: boolean) =>
    [
      "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition md:flex-none",
      active
        ? "bg-petroleum-800 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    ].join(" ");

  return (
    <div className="w-full md:w-auto">
      <span className="block text-sm font-medium text-slate-700" id="catalogo-vista-label">
        Ver como
      </span>
      <div
        className="mt-1 inline-flex w-full rounded-lg border border-slate-200 bg-white p-1 shadow-sm md:w-auto"
        role="group"
        aria-labelledby="catalogo-vista-label"
      >
        <button
          type="button"
          className={btnClass(!isGrid)}
          aria-pressed={!isGrid}
          aria-label="Lista"
          onClick={() => setMode(false)}
        >
          <LayoutList size={18} className="shrink-0" aria-hidden />
          <span className="hidden sm:inline">Lista</span>
        </button>
        <button
          type="button"
          className={btnClass(isGrid)}
          aria-pressed={isGrid}
          aria-label="Grid"
          onClick={() => setMode(true)}
        >
          <LayoutGrid size={18} className="shrink-0" aria-hidden />
          <span className="hidden sm:inline">Grid</span>
        </button>
      </div>
    </div>
  );
}
