import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-cookie";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin-app";
import { isFirebaseAuthConfigured } from "@/lib/firebase/public-config";

export type AuthenticatedApiUser = { uid: string; email?: string };

/**
 * When Firebase auth env is incomplete, APIs behave as before (no gate).
 * When configured, requires a valid session cookie.
 */
export async function authenticateApiRequest(
  request: NextRequest,
): Promise<NextResponse | AuthenticatedApiUser | { authDisabled: true }> {
  if (!isFirebaseAuthConfigured()) {
    return { authDisabled: true };
  }

  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(token, true);
    return { uid: decoded.uid, email: decoded.email ?? undefined };
  } catch {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
  }
}
