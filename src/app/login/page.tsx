import { Suspense } from "react";
import { getFirebasePublicConfig, isFirebaseAuthConfigured } from "@/lib/firebase/public-config";
import { LoginForm } from "@/app/login/login-form";

export const metadata = {
  title: "Entrar · Asset Manager",
};

export default function LoginPage() {
  const firebaseConfig = getFirebasePublicConfig();
  const authReady = isFirebaseAuthConfigured();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-16 text-slate-950">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-500">Asset Manager</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          Entre com Google ou e-mail e senha (Firebase Authentication).
        </p>
      </div>

      {!authReady ? (
        <div className="mt-8 max-w-md rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950">
          <p className="font-medium">Autenticação não configurada</p>
          <p className="mt-2 text-amber-900/90">
            Defina no <code className="rounded bg-amber-100/80 px-1">.env</code> as variáveis{" "}
            <code className="rounded bg-amber-100/80 px-1">NEXT_PUBLIC_FIREBASE_*</code> e{" "}
            <code className="rounded bg-amber-100/80 px-1">FIREBASE_SERVICE_ACCOUNT_KEY</code>{" "}
            (JSON da conta de serviço). Veja <code className="rounded bg-amber-100/80 px-1">.env.example</code>.
          </p>
        </div>
      ) : firebaseConfig ? (
        <Suspense
          fallback={
            <div className="mt-8 h-48 w-full max-w-sm animate-pulse rounded-md border border-slate-200 bg-white" />
          }
        >
          <LoginForm firebaseConfig={firebaseConfig} />
        </Suspense>
      ) : (
        <p className="mt-8 text-sm text-slate-600">
          Variáveis públicas do Firebase incompletas (apiKey, authDomain, projectId, appId).
        </p>
      )}
    </main>
  );
}
