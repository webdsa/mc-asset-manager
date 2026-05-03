import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/client";
import { isOwnerFirebaseUid } from "@/lib/app-owner";
import { getAppUser } from "@/lib/auth-user";
import { isStaffRole } from "@/lib/staff-role";
import { prisma } from "@/lib/prisma";
import { approveUserAction, revokeUserAction } from "@/app/admin/usuarios/actions";
import { UserRoleSelect } from "@/app/admin/usuarios/user-role-select";
import { PageHeader, pageMainInnerClass } from "@/components/page-header";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Autorizado",
  REVOKED: "Revogado",
};

export default async function AdminUsersPage() {
  const viewer = await getAppUser();
  if (!viewer || !isStaffRole(viewer.role)) {
    redirect("/admin");
  }

  const users = await prisma.user.findMany({
    orderBy: [{ accessStatus: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      displayName: true,
      firebaseUid: true,
      role: true,
      accessStatus: true,
      createdAt: true,
      approvedAt: true,
    },
  });

  return (
    <main className="min-h-screen bg-background text-slate-950">
      <PageHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm font-medium text-petroleum-800 hover:text-primary"
            >
              <ArrowLeft size={16} />
              Inventário
            </Link>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Shield className="text-slate-600" size={28} />
              Usuários
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Autoriza ou revoga o acesso. Administradores são definidos na base de dados; o dono da app está no{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">.env</code>.
            </p>
          </div>
        </div>
      </PageHeader>

      <div className={`${pageMainInnerClass} pb-8 pt-2`}>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Utilizador</th>
                <th className="hidden px-4 py-3 sm:table-cell">Firebase UID</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isAppOwner = u.role === UserRole.OWNER || isOwnerFirebaseUid(u.firebaseUid);
                return (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">
                      {u.displayName || u.email || "Sem nome"}
                    </div>
                    <div className="text-xs text-slate-500">{u.email ?? "—"}</div>
                  </td>
                  <td className="hidden max-w-[140px] truncate px-4 py-3 font-mono text-xs text-slate-500 sm:table-cell">
                    {u.firebaseUid}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {isAppOwner ? (
                      <span className="inline-flex rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-900">
                        Dono
                      </span>
                    ) : (
                      <UserRoleSelect
                        userId={u.id}
                        role={u.role === UserRole.ADMIN ? "ADMIN" : "USER"}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        u.accessStatus === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : u.accessStatus === "PENDING"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {statusLabel[u.accessStatus] ?? u.accessStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-wrap justify-end gap-2">
                      {u.accessStatus !== "APPROVED" ? (
                        <form action={approveUserAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover"
                          >
                            Autorizar
                          </button>
                        </form>
                      ) : null}
                      {u.id !== viewer.id && !isAppOwner ? (
                        <form action={revokeUserAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-50"
                          >
                            Revogar
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
          {users.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhum utilizador registado.</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
