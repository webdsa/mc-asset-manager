"use client";

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
}: {
  query: string;
  category: string;
  insurance: string;
  categories: CategoryOption[];
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
    <Form ref={formRef} className="grid gap-3 md:grid-cols-[1fr_220px_220px]" action="">
      <label className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          name="q"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            scheduleSearchSubmit();
          }}
          placeholder="Buscar por nome, marca, série ou local"
          className={`${inputClass} pl-10 pr-3`}
          autoComplete="off"
        />
      </label>

      <select
        name="category"
        value={categoryId}
        onChange={(event) => {
          setCategoryId(event.target.value);
          submitForm();
        }}
        className={inputClass}
      >
        <option value="">Todas categorias</option>
        {categories.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>

      <select
        name="insurance"
        value={insuranceStatus}
        onChange={(event) => {
          setInsuranceStatus(event.target.value);
          submitForm();
        }}
        className={inputClass}
      >
        <option value="">Todos seguros</option>
        {Object.values(InsuranceStatus).map((status) => (
          <option key={status} value={status}>
            {formatInsuranceStatus(status)}
          </option>
        ))}
      </select>
    </Form>
  );
}
