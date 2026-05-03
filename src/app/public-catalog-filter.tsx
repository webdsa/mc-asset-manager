"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";

type Cat = { id: string; name: string };

const SEARCH_DEBOUNCE_MS = 350;

export function PublicCatalogFilter({
  categories,
  selectedId,
  initialQuery,
}: {
  categories: Cat[];
  selectedId: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    startTransition(() => {
      setQuery(initialQuery);
    });
  }, [initialQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const pushParams = useCallback(
    (updates: { categoria?: string; q?: string }) => {
      const next = new URLSearchParams(searchParams?.toString());
      if (updates.categoria !== undefined) {
        if (!updates.categoria) {
          next.delete("categoria");
        } else {
          next.set("categoria", updates.categoria);
        }
      }
      if (updates.q !== undefined) {
        const trimmed = updates.q.trim();
        if (!trimmed) {
          next.delete("q");
        } else {
          next.set("q", trimmed);
        }
      }
      const qs = next.toString();
      router.push(qs ? `/?${qs}` : "/");
    },
    [router, searchParams],
  );

  const scheduleSearchPush = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        pushParams({ q: value });
      }, SEARCH_DEBOUNCE_MS);
    },
    [pushParams],
  );

  const onCategoryChange = useCallback(
    (value: string) => {
      pushParams({ categoria: value });
    },
    [pushParams],
  );

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-0 flex-1 sm:min-w-[min(100%,18rem)]">
        <label className="text-sm font-medium text-slate-700" htmlFor="catalogo-busca">
          Buscar
        </label>
        <div className="relative mt-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            id="catalogo-busca"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              scheduleSearchPush(v);
            }}
            placeholder="Nome, marca, modelo, local…"
            className="h-11 w-full min-h-11 rounded-md border border-slate-200 bg-white py-2 pl-10 pr-3 text-base shadow-sm outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/25 sm:text-sm"
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          Pesquisa apenas nas categorias públicas.
        </p>
      </div>

      <div className="w-full min-w-0 sm:w-auto sm:min-w-[12rem]">
        <label className="text-sm font-medium text-slate-700" htmlFor="filtro-categoria">
          Categoria
        </label>
        <select
          id="filtro-categoria"
          className="mt-1 min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 sm:text-sm"
          value={selectedId}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">Todas as categorias públicas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
