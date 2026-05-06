"use client";

import { useState, useTransition } from "react";

type Props = {
  categoryId: string;
  initialIsPublic: boolean;
  setCategoryIsPublicAction: (categoryId: string, isPublic: boolean) => Promise<void>;
};

export function CategoryPublicToggle({
  categoryId,
  initialIsPublic,
  setCategoryIsPublicAction,
}: Props) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex cursor-pointer items-center gap-3">
      <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={isPublic}
          disabled={pending}
          onChange={(e) => {
            const checked = e.target.checked;
            setIsPublic(checked);
            startTransition(() => {
              void setCategoryIsPublicAction(categoryId, checked).catch(() => {
                setIsPublic(!checked);
              });
            });
          }}
        />
        <span
          className={[
            "block h-7 w-12 rounded-full transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
            "bg-slate-200 peer-checked:bg-emerald-600",
          ].join(" ")}
        />
        <span
          className={[
            "pointer-events-none absolute left-1 top-1 block h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5",
          ].join(" ")}
        />
      </span>
      <span className="text-sm text-slate-600">
        {pending ? "A guardar…" : isPublic ? "Visível no catálogo público" : "Excluído do público"}
      </span>
    </label>
  );
}
