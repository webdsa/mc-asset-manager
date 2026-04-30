"use client";

import { useCallback, useState } from "react";
import { parseBrlCurrencyToNumber } from "@/lib/format";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function digitsToDisplay(digits: string): string {
  if (!digits) {
    return "";
  }
  const cents = parseInt(digits, 10);
  if (!Number.isFinite(cents)) {
    return "";
  }
  return brlFormatter.format(cents / 100);
}

const MAX_DIGITS = 14;

export function PurchaseValueField({
  name,
  className,
  initialAmount,
}: {
  name: string;
  className: string;
  initialAmount: number | null;
}) {
  const [digits, setDigits] = useState(() => {
    if (initialAmount == null || !Number.isFinite(initialAmount) || initialAmount <= 0) {
      return "";
    }
    return String(Math.round(initialAmount * 100));
  });

  const display = digitsToDisplay(digits);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
    setDigits(next);
  };

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const n = parseBrlCurrencyToNumber(text);
    if (n != null && n >= 0) {
      e.preventDefault();
      setDigits(String(Math.round(n * 100)).slice(0, MAX_DIGITS));
    }
  }, []);

  return (
    <input
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      placeholder="R$ 0,00"
      value={display}
      onChange={onChange}
      onPaste={onPaste}
    />
  );
}
