"use client";

import { useState } from "react";

function tryToHex6(raw: string): string | null {
  const v = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/i.test(v)) {
    return v.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/i.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function initialHex(defaultHex: string) {
  return tryToHex6(defaultHex) ?? "#64748b";
}

type CategoryColorFieldProps = {
  name?: string;
  defaultHex: string;
  /** Para associar o rótulo (`htmlFor`) ao controle de cor. */
  id: string;
};

export function CategoryColorField({ name = "color", defaultHex, id }: CategoryColorFieldProps) {
  const [hex, setHex] = useState(() => initialHex(defaultHex));

  return (
    <div className="mt-1 flex items-center">
      <input type="hidden" name={name} value={hex} />
      <input
        id={id}
        type="color"
        value={hex}
        onChange={(e) => setHex(e.target.value.toLowerCase())}
        className="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-slate-200 bg-white p-1 shadow-sm"
        aria-label="Cor da categoria"
        title="Cor da categoria"
      />
    </div>
  );
}
