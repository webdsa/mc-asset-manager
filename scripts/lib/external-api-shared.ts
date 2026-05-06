/**
 * Helpers partilhados pelos scripts que falam com a API externa de itens.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

export function loadEnvFromDotenvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFromDotenvFile();

export function envStr(key: string, fallback: string): string {
  const v = process.env[key]?.trim();
  return v && v.length > 0 ? v : fallback;
}

export function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return fallback;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export function envBool(key: string): boolean {
  const v = process.env[key]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function str(v: unknown): string | null {
  if (typeof v !== "string") {
    return null;
  }
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export function patrimonyFromApi(item: Record<string, unknown>): string | null {
  const keys = [
    "codigoPatrimonio",
    "codigo_patrimonio",
    "patrimonyCode",
    "patrimonio",
  ];
  for (const k of keys) {
    const s = str(item[k]);
    if (s) {
      return s;
    }
  }
  return null;
}

function coercePositiveInt(raw: unknown): number | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if ("$numberInt" in o) {
      return coercePositiveInt(o.$numberInt);
    }
    if ("$numberLong" in o) {
      return coercePositiveInt(o.$numberLong);
    }
    if ("$numberDouble" in o) {
      return coercePositiveInt(o.$numberDouble);
    }
  }
  if (typeof raw === "bigint") {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return null;
    }
    const i = Math.floor(n);
    return i >= 1 ? i : null;
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      return null;
    }
    const i = Math.floor(raw);
    return i >= 1 ? i : null;
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t.length) {
      return null;
    }
    let normalized = t.replace(/\s/g, "");
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else if (/^\d+,\d+$/.test(normalized)) {
      normalized = normalized.replace(",", ".");
    }
    const num = Number(normalized);
    if (!Number.isFinite(num)) {
      return null;
    }
    const i = Math.floor(num);
    return i >= 1 ? i : null;
  }
  return null;
}

function hasValidQuantityValue(obj: Record<string, unknown>): boolean {
  const keys = ["quantidade", "quantity", "qtde", "qtd"] as const;
  for (const k of keys) {
    if (coercePositiveInt(obj[k]) !== null) {
      return true;
    }
  }
  for (const [key, val] of Object.entries(obj)) {
    const lk = key.toLowerCase();
    if (lk === "quantidade" || lk === "quantity" || lk === "qtde" || lk === "qtd") {
      if (coercePositiveInt(val) !== null) {
        return true;
      }
    }
  }
  return false;
}

export function quantityFromApi(item: Record<string, unknown>): number {
  const keys = ["quantidade", "quantity", "qtde", "qtd"] as const;
  for (const k of keys) {
    const n = coercePositiveInt(item[k]);
    if (n !== null) {
      return n;
    }
  }
  for (const [key, val] of Object.entries(item)) {
    const lk = key.toLowerCase();
    if (lk === "quantidade" || lk === "quantity" || lk === "qtde" || lk === "qtd") {
      const n = coercePositiveInt(val);
      if (n !== null) {
        return n;
      }
    }
  }
  return 1;
}

/**
 * Junta o objeto `item` com campos de quantidade que por vezes vêm na raiz do JSON
 * (ex.: `{ "item": { "nome": "…" }, "quantidade": 16 }`) ou com `item` como array de um elemento.
 * Se `item.quantidade` for `null`/`undefined`/inválido, o valor na raiz passa a contar (antes `null` bloqueava o merge).
 */
export function mergeApiDetailPayload(detail: Record<string, unknown>): Record<string, unknown> {
  let inner: unknown = detail.item;
  if (Array.isArray(inner) && inner.length === 1) {
    inner = inner[0];
  }
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) {
    throw new Error("Resposta sem objeto item");
  }
  const base = { ...(inner as Record<string, unknown>) };
  const root = detail;
  const qtyKeys = ["quantidade", "quantity", "qtde", "qtd"] as const;

  if (!hasValidQuantityValue(base)) {
    for (const k of qtyKeys) {
      const rv = root[k];
      if (rv !== undefined && rv !== null) {
        base[k] = rv;
      }
    }
  }

  if (!hasValidQuantityValue(base)) {
    for (const [rk, rv] of Object.entries(root)) {
      const lk = rk.toLowerCase();
      if (
        (lk === "quantidade" || lk === "quantity" || lk === "qtde" || lk === "qtd") &&
        rv !== undefined &&
        rv !== null
      ) {
        base[rk] = rv;
        break;
      }
    }
  }
  return base;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}${body ? `\n${body.slice(0, 500)}` : ""}`);
  }
  return res.json() as Promise<T>;
}
