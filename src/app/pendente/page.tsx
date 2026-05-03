import Link from "next/link";
import { redirect } from "next/navigation";
import { UserAccessStatus } from "@/generated/prisma/client";
import { getAppUser } from "@/lib/auth-user";
import { isFirebaseAuthConfigured } from "@/lib/firebase/public-config";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function PendentePage() {
  if (!isFirebaseAuthConfigured()) {
    redirect("/");
  }

  const user = await getAppUser();
  if (!user) {
    redirect("/login");
  }

  if (user.accessStatus === UserAccessStatus.APPROVED) {
    redirect("/admin");
  }

  const isRevoked = user.accessStatus === UserAccessStatus.REVOKED;

  return (
    <main className="flex min-h-screen flex-col bg-background text-slate-950">
      <PageHeader>
        <h1 className="text-xl font-semibold text-slate-950">
          {isRevoked ? "Acesso revogado" : "Autorização pendente"}
        </h1>
      </PageHeader>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm leading-relaxed text-slate-600">
            {isRevoked
              ? "O teu acesso a esta aplicação foi revogado. Contacta um administrador se precisares de voltar a entrar."
              : "A tua conta foi criada, mas um administrador ainda precisa de autorizar o acesso ao sistema. Volta mais tarde ou contacta a equipa."}
          </p>
          {user.email ? (
            <p className="mt-4 text-xs text-slate-500">
              Conta: <span className="font-medium text-slate-700">{user.email}</span>
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login?sair=1"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
