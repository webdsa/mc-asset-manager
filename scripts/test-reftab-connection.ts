/**
 * Testa credenciais RefTab (HMAC) com GET /api/assets?limit=1
 * Uso: npx tsx scripts/test-reftab-connection.ts
 */

import { createHash, createHmac } from "crypto";
import "./lib/external-api-shared";

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
  // RefTab: base64 do digest em hex (ver n8n-nodes-reftab / ReftabShell), não base64 do binário.
  const hexDigest = createHmac("sha256", privateKey)
    .update(signatureToSign)
    .digest("hex");
  const token = Buffer.from(hexDigest).toString("base64");
  return { authorization: `RT ${publicKey}:${token}`, date: now };
}

async function main() {
  const publicKey = process.env.REFTAB_API_PUBLIC_KEY?.trim();
  const privateKey = process.env.REFTAB_API_PRIVATE_KEY?.trim();
  const base = (
    process.env.REFTAB_API_BASE_URL?.trim() || "https://www.reftab.com/api"
  ).replace(/\/$/, "");

  if (!publicKey || !privateKey) {
    console.error(
      "Defina REFTAB_API_PUBLIC_KEY e REFTAB_API_PRIVATE_KEY no .env",
    );
    process.exit(1);
  }

  const testUrl = `${base}/assets?limit=1`;
  const { authorization, date } = signReftabRequest(
    "GET",
    testUrl,
    publicKey,
    privateKey,
  );

  const res = await fetch(testUrl, {
    headers: {
      Authorization: authorization,
      "x-rt-date": date,
      Accept: "application/json",
    },
  });

  const text = await res.text();
  console.log("URL:", testUrl);
  console.log("Status:", res.status, res.statusText);
  console.log(
    "Chaves:",
    `public (${publicKey.length} chars), private (${privateKey.length} chars)`,
  );

  if (!res.ok) {
    console.error("Falha na API RefTab:");
    console.error(text.slice(0, 800));
    process.exit(1);
  }

  try {
    const json = JSON.parse(text) as unknown;
    if (Array.isArray(json)) {
      console.log("Conexão OK —", json.length, "asset(s) no preview (limit=1).");
      if (json[0] && typeof json[0] === "object") {
        const a = json[0] as Record<string, unknown>;
        const keys = Object.keys(a).slice(0, 8);
        console.log("Campos (amostra):", keys.join(", ") || "(vazio)");
        const label =
          a.name ?? a.assetName ?? a.title ?? a.description ?? a.uid;
        if (label != null) console.log("Identificador:", String(label));
      }
    } else if (json && typeof json === "object") {
      const o = json as Record<string, unknown>;
      const list = o.assets ?? o.data ?? o.items;
      const n = Array.isArray(list) ? list.length : "?";
      console.log("Conexão OK — resposta objeto, itens:", n);
      console.log("Chaves raiz:", Object.keys(o).join(", "));
    } else {
      console.log("Conexão OK — resposta:", String(json).slice(0, 200));
    }
  } catch {
    console.log("Conexão OK — corpo não-JSON:", text.slice(0, 300));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
