"use client";

import type { ReactNode } from "react";
import Form from "next/form";
import { Search } from "lucide-react";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { InsuranceStatus } from "@/generated/prisma/browser";
import { formatInsuranceStatus } from "@/lib/format";

type CategoryOption = { id: string; name: string };

const SEARCH_DEBOUNCE_MS = 350;

export function InventoryFilterForm({
  query,
  category,
  insurance,
  categories,
  viewToggle,
  preserveListView,
  preserveIncludeHidden,
}: {
  query: string;
  category: string;
  insurance: string;
  categories: CategoryOption[];
  viewToggle?: ReactNode;
  /** Mantém `vista=list` na URL ao enviar o formulário de filtros. */
  preserveListView?: boolean;
  /** Mantém `incluir_ocultos=1` — lista só itens excluídos (dono). */
  preserveIncludeHidden?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [q, setQ] = useState(query);
  const [categoryId, setCategoryId] = useState(category);
  const [insuranceStatus, setInsuranceStatus] = useState(insurance);

  useEffect(() => {
    startTransition(() => {
      setQ(query);
      setCategoryId(category);
      setInsuranceStatus(insurance);
    });
  }, [query, category, insurance]);

  const submitForm = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  const scheduleSearchSubmit = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(submitForm, SEARCH_DEBOUNCE_MS);
  }, [submitForm]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const inputClass =
    "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

  return (
    <Form
      ref={formRef}
      className={
        viewToggle
          ? "flex w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-4"
          : "grid gap-3 md:grid-cols-[1fr_220px_220px]"
      }
      action=""
    >
      {preserveListView ? <input type="hidden" name="vista" value="list" /> : null}
      {preserveIncludeHidden ? <input type="hidden" name="incluir_ocultos" value="1" /> : null}
      <div className="min-w-0 flex-1 md:min-w-[min(100%,12rem)]">
        <label
          className="block text-sm font-medium text-slate-700"
          htmlFor="inventory-busca"
        >
          Buscar
        </label>
        <div className="relative mt-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
            aria-hidden
          />
          <input
            id="inventory-busca"
            name="q"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              scheduleSearchSubmit();
            }}
            placeholder="Nome, categoria, marca, modelo, série, património, QR, descrição…"
            className={`${inputClass} pl-10 pr-3`}
            autoComplete="off"
          />
        </div>
      </div>

      <div className={viewToggle ? "md:w-[220px] md:shrink-0" : ""}>
        <label
          className="block text-sm font-medium text-slate-700"
          htmlFor="inventory-categoria"
        >
          Categoria
        </label>
        <select
          id="inventory-categoria"
          name="category"
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            submitForm();
          }}
          className={`mt-1 ${inputClass} w-full`}
        >
          <option value="">Todas categorias</option>
          {categories.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div className={viewToggle ? "md:w-[220px] md:shrink-0" : ""}>
        <label
          className="block text-sm font-medium text-slate-700"
          htmlFor="inventory-seguro"
        >
          Seguro
        </label>
        <select
          id="inventory-seguro"
          name="insurance"
          value={insuranceStatus}
          onChange={(event) => {
            setInsuranceStatus(event.target.value);
            submitForm();
          }}
          className={`mt-1 ${inputClass} w-full`}
        >
          <option value="">Todos seguros</option>
          {Object.values(InsuranceStatus).map((status) => (
            <option key={status} value={status}>
              {formatInsuranceStatus(status)}
            </option>
          ))}
        </select>
      </div>

      {viewToggle ? <div className="w-full shrink-0 md:w-auto">{viewToggle}</div> : null}
    </Form>
  );
}
