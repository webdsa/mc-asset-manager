import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SEC,
} from "@/lib/auth-cookie";
import { getFirebaseAdminAuth, getServiceAccountProjectId } from "@/lib/firebase/admin-app";
import {
  getFirebasePublicConfig,
  isFirebaseAuthConfigured,
} from "@/lib/firebase/public-config";

export const runtime = "nodejs";

const SESSION_COOKIE_MS = AUTH_SESSION_MAX_AGE_SEC * 1000;

function sessionErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "auth/id-token-expired":
      return "Sessão expirou antes de concluir o login. Tente de novo.";
    case "auth/session-cookie-expired":
    case "auth/session-cookie-revoked":
      return "Sessão inválida. Faça login novamente.";
    case "auth/argument-error":
      return "Pedido de sessão inválido. Atualize a página e tente novamente.";
    default:
      return fallback;
  }
}

async function readIdToken(request: NextRequest): Promise<string | undefined> {
  let fromBody: string | undefined;
  try {
    const body = (await request.json()) as { idToken?: unknown };
    if (typeof body.idToken === "string") {
      fromBody = body.idToken.trim();
    }
  } catch {
    // Sem corpo JSON (ex.: só Authorization).
  }

  if (fromBody) {
    return fromBody;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  if (!isFirebaseAuthConfigured()) {
    return NextResponse.json(
      { error: "Autenticação Firebase não configurada no servidor." },
      { status: 503 },
    );
  }

  const publicConfig = getFirebasePublicConfig();
  const saProjectId = getServiceAccountProjectId();
  if (publicConfig?.projectId && saProjectId && publicConfig.projectId !== saProjectId) {
    return NextResponse.json(
      {
        error:
          "O projeto da conta de serviço (project_id no JSON) não coincide com NEXT_PUBLIC_FIREBASE_PROJECT_ID. Use a chave do mesmo projeto Firebase do app web.",
        code: "config/project-mismatch",
      },
      { status: 500 },
    );
  }

  const idToken = await readIdToken(request);
  if (!idToken) {
    return NextResponse.json({ error: "idToken ausente" }, { status: 400 });
  }

  try {
    const auth = getFirebaseAdminAuth();
    // `createSessionCookie` já valida o ID token no backend; não chamar
    // `verifyIdToken(..., true)` aqui — o check de revogação é extra e pode falhar sem necessidade.
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_COOKIE_MS,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_SESSION_MAX_AGE_SEC,
    });
    return res;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const code = typeof err.code === "string" ? err.code : undefined;
    console.error("[auth/session]", code ?? "(no code)", err.message ?? e);

    const fallback =
      "Não foi possível validar o token. Confirme que o JSON da conta de serviço é do mesmo projeto que as variáveis NEXT_PUBLIC_FIREBASE_*.";

    return NextResponse.json(
      {
        error: sessionErrorMessage(code, fallback),
        ...(process.env.NODE_ENV === "development" && code
          ? { code, detail: err.message }
          : code
            ? { code }
            : {}),
      },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
