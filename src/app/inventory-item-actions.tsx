"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { deleteItem, restoreItem } from "@/app/actions";

export function InventoryItemActions({
  itemId,
  itemName,
  excludedAt,
  showRestore,
}: {
  itemId: string;
  itemName: string;
  /** Definido quando o item está excluído da lista; o dono pode remover definitivamente no servidor. */
  excludedAt?: string | Date | null;
  /** Inventário «Só excluídos» (dono): mostra botão de reativar. */
  showRestore?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const isExcluded = excludedAt != null && excludedAt !== "";

  function handleRestore() {
    const ok = window.confirm(
      `Repor "${itemName}" no inventário ativo? O item volta a aparecer na lista e no catálogo conforme a categoria.`,
    );
    if (!ok) {
      return;
    }
    const fd = new FormData();
    fd.set("itemId", itemId);
    startTransition(() => {
      void restoreItem(fd);
    });
  }

  function handleDelete() {
    const ok = window.confirm(
      isExcluded
        ? `Eliminar definitivamente "${itemName}"? Esta ação não pode ser desfeita (registo, imagens e nota fiscal são removidos).`
        : `Excluir "${itemName}" da lista? O cadastro permanece no banco (imagens e nota fiscal não são apagados).`,
    );
    if (!ok) {
      return;
    }
    const fd = new FormData();
    fd.set("itemId", itemId);
    startTransition(() => {
      void deleteItem(fd);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1 sm:justify-start lg:gap-1">
      <Link
        href={`/items/${itemId}/edit`}
        className="inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 lg:h-9 lg:w-9"
        title="Editar"
        aria-label={`Editar ${itemName}`}
      >
        <Pencil size={16} />
      </Link>
      {isExcluded && showRestore ? (
        <button
          type="button"
          onClick={handleRestore}
          disabled={pending}
          className="inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-md border border-slate-200 bg-white text-emerald-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900 disabled:opacity-50 lg:h-9 lg:w-9"
          title="Repor no inventário"
          aria-label={`Repor ${itemName} no inventário ativo`}
        >
          <RotateCcw size={16} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-md border border-slate-200 bg-white text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 lg:h-9 lg:w-9"
        title={isExcluded ? "Eliminar definitivamente" : "Excluir da lista"}
        aria-label={
          isExcluded
            ? `Eliminar definitivamente ${itemName}`
            : `Excluir ${itemName} da lista`
        }
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
