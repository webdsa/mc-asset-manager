"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import type { FirebasePublicConfig } from "@/lib/firebase/public-config";
import { getFirebaseClientAuth } from "@/lib/firebase/client-app";

type Props = {
  firebaseConfig: FirebasePublicConfig;
};

function mapAuthError(err: unknown): string {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Login cancelado.";
    case "auth/popup-blocked":
      return "O bloqueador de pop-ups impediu a janela do Google. Permitir pop-ups ou tente de novo.";
    case "auth/account-exists-with-different-credential":
      return "Esta conta já existe com outro método de login.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "E-mail ou senha incorretos.";
    default:
      if (err instanceof Error && err.message) {
        return err.message;
      }
      return "Não foi possível entrar. Tente novamente.";
  }
}

function googleProvider() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  p.addScope("email");
  p.addScope("profile");
  return p;
}

export function LoginForm({ firebaseConfig }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const completeLoginWithUser = useCallback(
    async (user: User) => {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Não foi possível criar a sessão.");
      }
      const data = (await res.json().catch(() => null)) as {
        accessStatus?: string;
      } | null;
      const next = searchParams.get("next");
      const pending =
        data?.accessStatus === "PENDING" || data?.accessStatus === "REVOKED";
      const dest =
        pending
          ? "/pendente"
          : next && next.startsWith("/") && next !== "/"
            ? next
            : "/admin";
      router.push(dest);
      router.refresh();
    },
    [router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const auth = getFirebaseClientAuth(firebaseConfig);
      try {
        const result = await getRedirectResult(auth);
        if (cancelled || !result?.user) {
          return;
        }
        setPending(true);
        setError(null);
        await completeLoginWithUser(result.user);
      } catch (err) {
        if (!cancelled) {
          setError(mapAuthError(err));
        }
      } finally {
        if (!cancelled) {
          setPending(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firebaseConfig, completeLoginWithUser]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const auth = getFirebaseClientAuth(firebaseConfig);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await completeLoginWithUser(credential.user);
    } catch (err: unknown) {
      setError(mapAuthError(err));
    } finally {
      setPending(false);
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    setPending(true);
    const auth = getFirebaseClientAuth(firebaseConfig);
    const provider = googleProvider();
    try {
      const { user } = await signInWithPopup(auth, provider);
      await completeLoginWithUser(user);
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          setError(mapAuthError(redirectErr));
        }
      } else {
        setError(mapAuthError(err));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <button
        type="button"
        disabled={pending}
        onClick={() => void onGoogleSignIn()}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
      >
        <GoogleMark className="h-5 w-5 shrink-0" aria-hidden />
        Continuar com Google
      </button>

      <div className="relative flex items-center py-1">
        <span className="grow border-t border-slate-200" />
        <span className="mx-3 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
          ou e-mail
        </span>
        <span className="grow border-t border-slate-200" />
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none ring-slate-950/10 focus:border-slate-300 focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none ring-slate-950/10 focus:border-slate-300 focus:ring-2"
          />
        </div>
        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar com e-mail"}
        </button>
      </form>
    </div>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
