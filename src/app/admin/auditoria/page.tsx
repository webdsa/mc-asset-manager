import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";
import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth-user";
import {
  formatActorLabel,
  formatDateTimeSaoPaulo,
  formatItemAuditActionLabel,
} from "@/lib/item-audit-log";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/staff-role";
import { PageHeader, pageMainInnerClass } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const viewer = await getAppUser();
  if (!viewer || !isStaffRole(viewer.role)) {
    redirect("/admin");
  }

  const logs = await prisma.itemAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  return (
    <>
      <PageHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-primary"
            >
              <ArrowLeft size={16} />
              Voltar ao inventário
            </Link>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Auditoria</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-petroleum-900">
              <ScrollText size={26} className="shrink-0 text-primary" aria-hidden />
              Registo de alterações em ativos
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Data e hora em fuso de São Paulo. No banco os instantes ficam em UTC; a coluna abaixo usa{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">America/Sao_Paulo</code>.
            </p>
          </div>
        </div>
      </PageHeader>

      <main className={pageMainInnerClass}>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-600">Ainda não há registos de auditoria.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Data/hora (SP)</th>
                  <th className="px-4 py-3">Utilizador</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                      <time dateTime={log.createdAt.toISOString()} title={log.createdAt.toISOString()}>
                        {formatDateTimeSaoPaulo(log.createdAt)}
                      </time>
                    </td>
                    <td className="max-w-[14rem] px-4 py-3 text-slate-800">
                      {formatActorLabel(log)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {formatItemAuditActionLabel(log.action, log.metadata)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="block">{log.itemNameSnapshot ?? "—"}</span>
                      <Link
                        href={`/items/${log.itemId}/edit`}
                        className="mt-0.5 inline-block text-xs font-medium text-primary hover:underline"
                      >
                        Abrir cadastro
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
