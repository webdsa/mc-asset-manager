export function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Sem valor";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

/**
 * Interpreta texto no formato brasileiro (ex.: "R$ 1.234,56", "1234,56", "1.234")
 * como número. Retorna null se vazio ou inválido.
 */
export function parseBrlCurrencyToNumber(raw: string): number | null {
  const cleaned = String(raw)
    .replace(/\u00a0/g, " ")
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .trim();
  if (!cleaned) {
    return null;
  }

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized: string;
  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  } else if (hasDot) {
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      normalized = parts.join("");
    } else if (
      parts.length === 2 &&
      parts[1].length === 3 &&
      /^\d+$/.test(parts[0]) &&
      /^\d+$/.test(parts[1])
    ) {
      normalized = parts[0] + parts[1];
    } else {
      normalized = cleaned;
    }
  } else {
    normalized = cleaned;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatInsuranceStatus(status: string) {
  const labels: Record<string, string> = {
    INSURED: "Segurado",
    PENDING: "Pendente",
    EXPIRED: "Expirado",
    NOT_INSURED: "Sem seguro",
  };

  return labels[status] ?? status;
}

export function formatCondition(condition: string) {
  const labels: Record<string, string> = {
    NEW: "Novo",
    GOOD: "Bom",
    NEEDS_REPAIR: "Precisa reparo",
    RETIRED: "Retirado",
  };

  return labels[condition] ?? condition;
}
