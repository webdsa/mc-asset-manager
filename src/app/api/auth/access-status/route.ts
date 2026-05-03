import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-cookie";
import { syncFirebaseUserFromDecoded } from "@/lib/firebase-user-sync";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin-app";
import { isFirebaseAuthConfigured } from "@/lib/firebase/public-config";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  if (!isFirebaseAuthConfigured()) {
    return NextResponse.json({
      ok: true,
      accessStatus: "APPROVED",
      role: "USER",
      email: null as string | null,
      displayName: null as string | null,
    });
  }

  const token = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Sem sessão" }, { status: 401 });
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(token, true);
    let user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });
    if (!user) {
      user = await syncFirebaseUserFromDecoded(decoded);
    }

    return NextResponse.json({
      ok: true,
      accessStatus: user.accessStatus,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
    });
  } catch (e) {
    console.error("[auth/access-status]", e);
    return NextResponse.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
  }
}
