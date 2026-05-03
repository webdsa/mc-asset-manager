import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-cookie";
import { UserAccessStatus } from "@/generated/prisma/client";
import { syncFirebaseUserFromDecoded } from "@/lib/firebase-user-sync";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin-app";
import { isFirebaseAuthConfigured } from "@/lib/firebase/public-config";
import { prisma } from "@/lib/prisma";

export type AuthenticatedApiUser = { uid: string; email?: string };

/**
 * When Firebase auth env is incomplete, APIs behave as before (no gate).
 * When configured, requires a valid session cookie e utilizador APPROVED na base de dados.
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
    let dbUser = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });
    if (!dbUser) {
      dbUser = await syncFirebaseUserFromDecoded(decoded);
    }
    if (dbUser.accessStatus !== UserAccessStatus.APPROVED) {
      return NextResponse.json(
        {
          error: "Conta pendente de autorização ou revogada.",
          code: "access_pending_or_revoked",
        },
        { status: 403 },
      );
    }
    return { uid: decoded.uid, email: decoded.email ?? undefined };
  } catch {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
  }
}
