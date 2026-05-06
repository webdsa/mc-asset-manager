"use client";

import { LayoutGrid, LayoutList } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function AdminInventoryViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGrid = searchParams.get("vista") !== "list";

  const setMode = useCallback(
    (grid: boolean) => {
      const next = new URLSearchParams(searchParams?.toString());
      if (grid) {
        next.delete("vista");
      } else {
        next.set("vista", "list");
      }
      const qs = next.toString();
      router.push(qs ? `/admin?${qs}` : "/admin");
    },
    [router, searchParams],
  );

  const btnClass = (active: boolean) =>
    [
      "inline-flex h-full min-h-0 flex-1 items-center justify-center gap-1.5 rounded px-2 text-sm font-medium transition md:flex-none",
      active
        ? "bg-petroleum-800/12 text-petroleum-900"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    ].join(" ");

  return (
    <div className="w-full md:w-auto">
      <span className="block text-sm font-medium text-slate-700" id="admin-vista-label">
        Ver como
      </span>
      <div
        className="mt-1 inline-flex h-11 w-full items-stretch rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm md:w-auto"
        role="group"
        aria-labelledby="admin-vista-label"
      >
        <button
          type="button"
          className={btnClass(!isGrid)}
          aria-pressed={!isGrid}
          aria-label="Lista"
          onClick={() => setMode(false)}
        >
          <LayoutList size={16} className="shrink-0" aria-hidden />
          <span className="hidden sm:inline">Lista</span>
        </button>
        <button
          type="button"
          className={btnClass(isGrid)}
          aria-pressed={isGrid}
          aria-label="Grid"
          onClick={() => setMode(true)}
        >
          <LayoutGrid size={16} className="shrink-0" aria-hidden />
          <span className="hidden sm:inline">Grid</span>
        </button>
      </div>
    </div>
  );
}
