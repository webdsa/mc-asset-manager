import { decodeProtectedHeader, importX509, jwtVerify } from "jose";

const PUBLIC_KEYS_URL =
  "https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys";

const KEYS_CACHE_MS = 60 * 60 * 1000;

type KeysCache = { keys: Record<string, string>; fetchedAt: number };

let keysCache: KeysCache | null = null;

async function getSessionCookiePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (keysCache && now - keysCache.fetchedAt < KEYS_CACHE_MS) {
    return keysCache.keys;
  }

  const res = await fetch(PUBLIC_KEYS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase session public keys: ${res.status}`);
  }
  const keys = (await res.json()) as Record<string, string>;
  keysCache = { keys, fetchedAt: now };
  return keys;
}

/**
 * Verifies a Firebase **session** cookie JWT on the Edge (proxy).
 * Uses Identity Toolkit public keys (not the ID-token JWKS).
 */
export async function verifyFirebaseSessionCookieEdge(
  token: string,
  projectId: string,
): Promise<void> {
  const header = decodeProtectedHeader(token);
  const kid = header.kid;
  if (!kid || header.alg !== "RS256") {
    throw new Error("Invalid session token header");
  }

  const keys = await getSessionCookiePublicKeys();
  const pem = keys[kid];
  if (!pem) {
    throw new Error("Unknown session token signing key");
  }

  const key = await importX509(pem, "RS256");
  await jwtVerify(token, key, {
    algorithms: ["RS256"],
    issuer: `https://session.firebase.google.com/${projectId}`,
    audience: projectId,
  });
}
