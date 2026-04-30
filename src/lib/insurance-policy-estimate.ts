import { parseBrlCurrencyToNumber } from "@/lib/format";

export const INSURANCE_POLICY_BASIC = "Básico";
export const INSURANCE_POLICY_COMPLETE = "Completo";
export const INSURANCE_POLICY_ZERO_DEDUCTIBLE = "Franquia Zero";

export const INSURANCE_POLICY_OPTIONS = [
  INSURANCE_POLICY_BASIC,
  INSURANCE_POLICY_COMPLETE,
  INSURANCE_POLICY_ZERO_DEDUCTIBLE,
] as const;

export function parsePurchaseValue(raw: string): number | null {
  const n = parseBrlCurrencyToNumber(raw);
  return n != null && n > 0 ? n : null;
}

/** Taxa anual estimada (ex.: 0,035 = 3,5% do valor do item). */
export function insurancePolicyAnnualRate(policy: string): number | null {
  if (policy === INSURANCE_POLICY_BASIC) {
    return 0.035;
  }
  if (policy === INSURANCE_POLICY_COMPLETE) {
    return 0.07;
  }
  if (policy === INSURANCE_POLICY_ZERO_DEDUCTIBLE) {
    return 0.1;
  }
  return null;
}

/** Rótulo da taxa para exibição (estimativa anual). */
export function insurancePolicyRateDisplay(policy: string): string | null {
  if (policy === INSURANCE_POLICY_BASIC) {
    return "3,5%";
  }
  if (policy === INSURANCE_POLICY_COMPLETE) {
    return "7%";
  }
  if (policy === INSURANCE_POLICY_ZERO_DEDUCTIBLE) {
    return "10%";
  }
  return null;
}

export function annualInsuranceEstimateAmount(
  purchase: number,
  policy: string,
): number | null {
  const rate = insurancePolicyAnnualRate(policy);
  return rate != null ? purchase * rate : null;
}
