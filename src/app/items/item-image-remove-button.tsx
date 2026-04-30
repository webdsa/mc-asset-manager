"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteItemImage } from "@/app/actions";

export function ItemImageRemoveButton({
  itemId,
  imageId,
}: {
  itemId: string;
  imageId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm("Remover esta foto do item?");
    if (!ok) {
      return;
    }
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("imageId", imageId);
    startTransition(() => {
      void deleteItemImage(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="absolute right-1.5 top-1.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-rose-600 shadow-md backdrop-blur-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
      title="Remover foto"
      aria-label="Remover esta foto"
    >
      <Trash2 size={15} />
    </button>
  );
}
