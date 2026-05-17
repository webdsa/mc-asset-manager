/**
 * Cliente mínimo para a API RefTab (autenticação HMAC).
 * Uso em scripts CLI; variáveis: REFTAB_API_PUBLIC_KEY, REFTAB_API_PRIVATE_KEY, REFTAB_API_BASE_URL.
 */

import { createHash, createHmac } from "crypto";
import "./external-api-shared";

export type ReftabConfig = {
  publicKey: string;
  privateKey: string;
  baseUrl: string;
};

export function getReftabConfig(): ReftabConfig {
  const publicKey = process.env.REFTAB_API_PUBLIC_KEY?.trim();
  const privateKey = process.env.REFTAB_API_PRIVATE_KEY?.trim();
  const baseUrl = (
    process.env.REFTAB_API_BASE_URL?.trim() || "https://www.reftab.com/api"
  ).replace(/\/$/, "");

  if (!publicKey || !privateKey) {
    throw new Error(
      "Defina REFTAB_API_PUBLIC_KEY e REFTAB_API_PRIVATE_KEY no .env",
    );
  }

  return { publicKey, privateKey, baseUrl };
}

function signReftabRequest(
  method: string,
  url: string,
  publicKey: string,
  privateKey: string,
  body?: string,
): { authorization: string; date: string } {
  const now = new Date().toUTCString();
  let contentMD5 = "";
  let contentType = "";
  if (body !== undefined) {
    contentMD5 = createHash("md5").update(body).digest("hex");
    contentType = "application/json";
  }
  const signatureToSign =
    method + "\n" + contentMD5 + "\n" + contentType + "\n" + now + "\n" + url;
  const hexDigest = createHmac("sha256", privateKey)
    .update(signatureToSign)
    .digest("hex");
  const token = Buffer.from(hexDigest).toString("base64");
  return { authorization: `RT ${publicKey}:${token}`, date: now };
}

export async function reftabFetch(
  config: ReftabConfig,
  path: string,
  init?: { method?: string; body?: string },
): Promise<Response> {
  const method = init?.method ?? "GET";
  const pathNorm = path.startsWith("/") ? path : `/${path}`;
  const url = `${config.baseUrl}${pathNorm}`;
  const { authorization, date } = signReftabRequest(
    method,
    url,
    config.publicKey,
    config.privateKey,
    init?.body,
  );

  return fetch(url, {
    method,
    body: init?.body,
    headers: {
      Authorization: authorization,
      "x-rt-date": date,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

export async function reftabJson<T>(
  config: ReftabConfig,
  path: string,
  init?: { method?: string; body?: string },
): Promise<T> {
  const res = await reftabFetch(config, path, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `RefTab HTTP ${res.status} ${res.statusText} — ${path}\n${text.slice(0, 800)}`,
    );
  }
  return JSON.parse(text) as T;
}

/** A API por vezes devolve `[[ {...}, ... ]]` em vez de um array simples. */
export function unwrapReftabList<T>(raw: unknown): T[] {
  if (Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0])) {
    return raw[0] as T[];
  }
  if (Array.isArray(raw)) {
    return raw as T[];
  }
  return [];
}
