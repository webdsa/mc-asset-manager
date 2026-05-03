import { Suspense } from "react";
import { getFirebasePublicConfig, isFirebaseAuthConfigured } from "@/lib/firebase/public-config";
import { FirebaseSessionCleanup } from "@/app/login/firebase-session-cleanup";
import { LoginForm } from "@/app/login/login-form";

export const metadata = {
  title: "Entrar · Asset Manager",
};

type PageProps = {
  searchParams: Promise<{ encerrar?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const encerrarRaw = params.encerrar;
  const encerrar =
    encerrarRaw === "1" || (Array.isArray(encerrarRaw) && encerrarRaw.includes("1"));

  const firebaseConfig = getFirebasePublicConfig();
  const authReady = isFirebaseAuthConfigured();

  return (
    <main className="flex min-h-screen flex-col bg-background text-slate-950">
      <div className="flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-5 sm:py-16">
        <h1 className="mb-6 w-full max-w-[18ch] text-balance text-center text-[clamp(1.875rem,5.5vw+0.65rem,3rem)] font-semibold leading-[1.12] tracking-tight text-slate-950 sm:mb-10 sm:max-w-none sm:text-5xl sm:leading-[1.1]">
          Asset Manager
        </h1>
        {!authReady ? (
          <div className="w-full max-w-md rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950">
            <p className="font-medium">Autenticação não configurada</p>
            <p className="mt-2 text-amber-900/90">
              Defina no <code className="rounded bg-amber-100/80 px-1">.env</code> as variáveis{" "}
              <code className="rounded bg-amber-100/80 px-1">NEXT_PUBLIC_FIREBASE_*</code> e{" "}
              <code className="rounded bg-amber-100/80 px-1">FIREBASE_SERVICE_ACCOUNT_KEY</code>{" "}
              (JSON da conta de serviço). Veja <code className="rounded bg-amber-100/80 px-1">.env.example</code>.
            </p>
          </div>
        ) : firebaseConfig ? (
          <>
            <FirebaseSessionCleanup firebaseConfig={firebaseConfig} active={encerrar} />
            <Suspense
              fallback={
                <div className="h-48 w-full max-w-sm animate-pulse rounded-md border border-slate-200 bg-white" />
              }
            >
              <LoginForm firebaseConfig={firebaseConfig} />
            </Suspense>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            Variáveis públicas do Firebase incompletas (apiKey, authDomain, projectId, appId).
          </p>
        )}
      </div>
    </main>
  );
}
