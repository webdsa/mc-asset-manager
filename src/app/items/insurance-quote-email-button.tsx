"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { sendInsuranceQuoteEmail } from "@/app/items/send-insurance-quote-email";

type CategoryOption = { id: string; name: string };

function textField(form: HTMLFormElement, name: string): string | null {
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value;
  }
  if (el instanceof HTMLSelectElement) {
    return el.value;
  }
  return null;
}

export function InsuranceQuoteEmailButton({
  formId,
  categories,
}: {
  formId: string;
  categories: CategoryOption[];
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    const form = document.getElementById(formId);
    if (!form || !(form instanceof HTMLFormElement)) {
      setStatus("error");
      setMessage("Formulário não encontrado.");
      return;
    }

    const categoryId = textField(form, "categoryId");
    const categoryName =
      categories.find((c) => c.id === (categoryId ?? ""))?.name ?? null;

    const itemIdRaw = textField(form, "itemId");
    const itemId = itemIdRaw?.trim() ? itemIdRaw.trim() : null;

    setStatus("loading");
    setMessage(null);

    const result = await sendInsuranceQuoteEmail({
      itemId,
      name: textField(form, "name") ?? "",
      categoryName,
      brand: textField(form, "brand"),
      model: textField(form, "model"),
      serialNumber: textField(form, "serialNumber"),
      patrimonyCode: textField(form, "patrimonyCode"),
      qrCode: textField(form, "qrCode"),
      purchaseYear: textField(form, "purchaseYear"),
      purchaseDate: textField(form, "purchaseDate"),
      purchaseValueRaw: textField(form, "purchaseValue"),
      insuranceStatus: textField(form, "insuranceStatus") ?? "",
      insurancePolicy: textField(form, "insurancePolicy"),
      insuranceExpires: textField(form, "insuranceExpires"),
    });

    if (result.ok) {
      setStatus("success");
      setMessage("E-mail enviado com sucesso.");
    } else {
      setStatus("error");
      setMessage(result.message);
    }
  }

  return (
    <div className="sm:col-span-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
      >
        <Mail size={18} className="shrink-0 text-slate-600" aria-hidden />
        {status === "loading" ? "Enviando…" : "Enviar dados por e-mail para apólice"}
      </button>
      {message ? (
        <p
          className={
            status === "error"
              ? "mt-2 text-sm text-rose-600"
              : "mt-2 text-sm text-emerald-700"
          }
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
