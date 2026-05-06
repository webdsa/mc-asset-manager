"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Só deve ser renderizado para o dono da app (OWNER). `incluir_ocultos=1` = listar só itens excluídos (soft-delete). */
export function AdminIncludeHiddenToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onlyHidden = searchParams.get("incluir_ocultos") === "1";

  const setOnlyHidden = useCallback(
    (next: boolean) => {
      const p = new URLSearchParams(searchParams?.toString());
      if (next) {
        p.set("incluir_ocultos", "1");
      } else {
        p.delete("incluir_ocultos");
      }
      p.delete("pagina");
      const qs = p.toString();
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
      <span
        className="block text-sm font-medium text-slate-700"
        id="admin-excluidos-label"
      >
        Itens excluídos
      </span>
      <div
        className="mt-1 inline-flex h-11 w-full items-stretch rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm md:w-auto"
        role="group"
        aria-labelledby="admin-excluidos-label"
      >
        <button
          type="button"
          className={btnClass(!onlyHidden)}
          aria-pressed={!onlyHidden}
          aria-label="Itens ativos no inventário"
          onClick={() => setOnlyHidden(false)}
        >
          <Eye size={16} className="shrink-0" aria-hidden />
          <span className="hidden sm:inline">Inventário</span>
        </button>
        <button
          type="button"
          className={btnClass(onlyHidden)}
          aria-pressed={onlyHidden}
          aria-label="Mostrar apenas itens excluídos"
          onClick={() => setOnlyHidden(true)}
        >
          <EyeOff size={16} className="shrink-0" aria-hidden />
          <span className="hidden sm:inline">Só excluídos</span>
        </button>
      </div>
    </div>
  );
}
