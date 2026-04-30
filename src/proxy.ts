import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-cookie";
import { getFirebasePublicConfig, isFirebaseAuthConfigured } from "@/lib/firebase/public-config";
import { verifyFirebaseSessionCookieEdge } from "@/lib/verify-firebase-session-cookie-edge";

function isLoginPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

export async function proxy(request: NextRequest) {
  if (!isFirebaseAuthConfigured()) {
    return NextResponse.next();
  }

  const publicConfig = getFirebasePublicConfig();
  if (!publicConfig) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(AUTH_SESSION_COOKIE)?.value;

  if (isLoginPath(pathname)) {
    if (sessionToken) {
      try {
        await verifyFirebaseSessionCookieEdge(sessionToken, publicConfig.projectId);
        return NextResponse.redirect(new URL("/", request.url));
      } catch {
        const res = NextResponse.next();
        res.cookies.delete(AUTH_SESSION_COOKIE);
        return res;
      }
    }
    return NextResponse.next();
  }

  if (!sessionToken) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  try {
    await verifyFirebaseSessionCookieEdge(sessionToken, publicConfig.projectId);
    return NextResponse.next();
  } catch {
    const login = new URL("/login", request.url);
    const res = NextResponse.redirect(login);
    res.cookies.delete(AUTH_SESSION_COOKIE);
    return res;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
