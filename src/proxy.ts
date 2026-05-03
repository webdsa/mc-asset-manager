import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-cookie";
import { getFirebasePublicConfig, isFirebaseAuthConfigured } from "@/lib/firebase/public-config";
import { isStaffRoleString } from "@/lib/staff-role";
import { verifyFirebaseSessionCookieEdge } from "@/lib/verify-firebase-session-cookie-edge";

function isLoginPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

const PENDING_ROUTE = "/pendente";

type AccessPayload = {
  ok?: boolean;
  accessStatus?: string;
  role?: string;
};

/** Rotas só para ADMIN / OWNER (não confundir com `/admin` = área privada da app). */
function adminRouteRequiresStaffRole(pathname: string): boolean {
  return (
    pathname === "/admin/usuarios" ||
    pathname.startsWith("/admin/usuarios/") ||
    pathname === "/admin/categorias-publicas" ||
    pathname.startsWith("/admin/categorias-publicas/")
  );
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

  if (pathname === "/catalogo-publico" || pathname.startsWith("/catalogo-publico/")) {
    const dest = new URL("/", request.url);
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest, 308);
  }

  if (pathname === "/") {
    return NextResponse.next();
  }

  if (/^\/api\/items\/[^/]+\/images\/[^/]+$/.test(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(AUTH_SESSION_COOKIE)?.value;

  if (isLoginPath(pathname)) {
    if (request.nextUrl.searchParams.get("sair") === "1") {
      const next = new URL("/login", request.url);
      next.searchParams.set("encerrar", "1");
      const res = NextResponse.redirect(next);
      res.cookies.delete(AUTH_SESSION_COOKIE);
      return res;
    }
    if (sessionToken) {
      try {
        await verifyFirebaseSessionCookieEdge(sessionToken, publicConfig.projectId);
        return NextResponse.redirect(new URL("/admin", request.url));
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
  } catch {
    const login = new URL("/login", request.url);
    const res = NextResponse.redirect(login);
    res.cookies.delete(AUTH_SESSION_COOKIE);
    return res;
  }

  const accessUrl = new URL("/api/auth/access-status", request.url);
  let accessRes: Response;
  try {
    accessRes = await fetch(accessUrl, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.next();
  }

  if (!accessRes.ok) {
    const login = new URL("/login", request.url);
    const res = NextResponse.redirect(login);
    res.cookies.delete(AUTH_SESSION_COOKIE);
    return res;
  }

  let data: AccessPayload;
  try {
    data = (await accessRes.json()) as AccessPayload;
  } catch {
    const login = new URL("/login", request.url);
    const res = NextResponse.redirect(login);
    res.cookies.delete(AUTH_SESSION_COOKIE);
    return res;
  }

  if (data.ok !== true || !data.accessStatus || !data.role) {
    const login = new URL("/login", request.url);
    const res = NextResponse.redirect(login);
    res.cookies.delete(AUTH_SESSION_COOKIE);
    return res;
  }

  const isPendingUser = data.accessStatus === "PENDING" || data.accessStatus === "REVOKED";

  if (isPendingUser && pathname !== PENDING_ROUTE && pathname !== "/") {
    return NextResponse.redirect(new URL(PENDING_ROUTE, request.url));
  }

  if (
    pathname.startsWith("/admin") &&
    adminRouteRequiresStaffRole(pathname) &&
    !isStaffRoleString(data.role)
  ) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (!isPendingUser && pathname === PENDING_ROUTE) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
