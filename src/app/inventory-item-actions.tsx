"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deleteItem } from "@/app/actions";

export function InventoryItemActions({
  itemId,
  itemName,
}: {
  itemId: string;
  itemName: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const ok = window.confirm(
      `Excluir o item "${itemName}"? Esta ação não pode ser desfeita.`,
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
    <div className="flex items-center justify-end gap-1 sm:justify-start">
      <Link
        href={`/items/${itemId}/edit`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
        title="Editar"
        aria-label={`Editar ${itemName}`}
      >
        <Pencil size={16} />
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-rose-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
        title="Excluir"
        aria-label={`Excluir ${itemName}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
