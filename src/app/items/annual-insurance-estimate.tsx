"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";
import {
  annualInsuranceEstimateAmount,
  insurancePolicyRateDisplay,
  parsePurchaseValue,
} from "@/lib/insurance-policy-estimate";

function readFormValues(form: HTMLFormElement) {
  const purchaseEl = form.elements.namedItem("purchaseValue");
  const policyEl = form.elements.namedItem("insurancePolicy");
  const raw = purchaseEl instanceof HTMLInputElement ? purchaseEl.value : "";
  const policy = policyEl instanceof HTMLSelectElement ? policyEl.value : "";
  const purchase = parsePurchaseValue(raw);
  return { purchase, policy };
}

type EstimateDisplay =
  | { type: "estimate"; text: string; rateLabel: string }
  | { type: "hint"; text: string };

function computeDisplay(purchase: number | null, policy: string): EstimateDisplay {
  if (!purchase) {
    return {
      type: "hint",
      text: "Informe o valor de compra na seção Compra e documentação.",
    };
  }
  const amount = annualInsuranceEstimateAmount(purchase, policy);
  const rateLabel = insurancePolicyRateDisplay(policy);
  if (amount != null && rateLabel) {
    return { type: "estimate", text: formatCurrency(amount), rateLabel };
  }
  return {
    type: "hint",
    text: "Selecione uma apólice (Básica, Completa ou Franquia Zero).",
  };
}

const boxClass =
  "flex min-h-11 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none";

export function AnnualInsuranceEstimate({
  formId,
  initialPurchase,
  initialPolicy,
}: {
  formId: string;
  initialPurchase: number | null;
  initialPolicy: string;
}) {
  const [display, setDisplay] = useState<EstimateDisplay>(() =>
    computeDisplay(initialPurchase, initialPolicy),
  );

  const sync = useCallback(() => {
    const el = document.getElementById(formId);
    if (!el || !(el instanceof HTMLFormElement)) {
      return;
    }
    const { purchase, policy } = readFormValues(el);
    setDisplay(computeDisplay(purchase, policy));
  }, [formId]);

  useEffect(() => {
    const el = document.getElementById(formId);
    if (!el || !(el instanceof HTMLFormElement)) {
      return;
    }
    el.addEventListener("input", sync);
    el.addEventListener("change", sync);
    return () => {
      el.removeEventListener("input", sync);
      el.removeEventListener("change", sync);
    };
  }, [formId, sync]);

  return (
    <div className="sm:col-span-2">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        Estimativa anual do seguro
      </span>
      <div
        className={
          display.type === "estimate"
            ? `${boxClass} font-medium text-slate-900`
            : `${boxClass} text-slate-500`
        }
      >
        {display.text}
      </div>
      {display.type === "estimate" ? (
        <p className="mt-1 text-xs text-slate-500">
          Valor de compra × {display.rateLabel} ao ano (estimativa; não substitui a apólice real).
        </p>
      ) : null}
    </div>
  );
}
