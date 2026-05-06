import {
  formatActorLabel,
  formatDateTimeSaoPaulo,
  formatItemAuditActionLabel,
} from "@/lib/item-audit-log";
import { prisma } from "@/lib/prisma";

export async function ItemAuditHistory({
  itemId,
  title = "Histórico de alterações",
}: {
  itemId: string;
  title?: string;
}) {
  const logs = await prisma.itemAuditLog.findMany({
    where: { itemId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  if (logs.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        <p>Nenhum registo ainda (fusos horários exibidos para São Paulo).</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <ul className="divide-y divide-slate-100">
        {logs.map((log) => (
          <li key={log.id} className="px-4 py-2.5 text-sm">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
              <span className="font-medium text-slate-900">
                {formatItemAuditActionLabel(log.action, log.metadata)}
              </span>
              <time
                className="text-xs text-slate-500 tabular-nums"
                dateTime={log.createdAt.toISOString()}
                title={`UTC: ${log.createdAt.toISOString()}`}
              >
                {formatDateTimeSaoPaulo(log.createdAt)} (São Paulo)
              </time>
            </div>
            <p className="mt-0.5 text-slate-600">{formatActorLabel(log)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
