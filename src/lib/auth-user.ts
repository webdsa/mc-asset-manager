import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-cookie";
import { syncFirebaseUserFromDecoded } from "@/lib/firebase-user-sync";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin-app";
import { isFirebaseAuthConfigured } from "@/lib/firebase/public-config";
import { prisma } from "@/lib/prisma";

/** Utilizador na base de dados para o cookie de sessão atual, ou `null` se não houver sessão válida. */
export async function getAppUser() {
  if (!isFirebaseAuthConfigured()) {
    return null;
  }

  const token = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(token, true);
    let user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });
    if (!user) {
      user = await syncFirebaseUserFromDecoded(decoded);
    }
    return user;
  } catch {
    return null;
  }
}
