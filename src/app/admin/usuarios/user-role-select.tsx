"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { setUserRoleAction } from "@/app/admin/usuarios/actions";

type Props = {
  userId: string;
  role: "USER" | "ADMIN";
};

export function UserRoleSelect({ userId, role }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const lastSaved = useRef(role);

  useEffect(() => {
    lastSaved.current = role;
  }, [role]);

  return (
    <select
      disabled={pending}
      value={role}
      aria-busy={pending}
      onChange={(e) => {
        const next = e.target.value as "USER" | "ADMIN";
        if (next === lastSaved.current) {
          return;
        }
        const fd = new FormData();
        fd.set("userId", userId);
        fd.set("role", next);
        startTransition(() => {
          void setUserRoleAction(fd)
            .then(() => {
              lastSaved.current = next;
              router.refresh();
            })
            .catch(() => {
              router.refresh();
            });
        });
      }}
      className="w-full min-w-[140px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm outline-none ring-slate-950/10 focus:border-slate-300 focus:ring-2 disabled:opacity-60 sm:w-auto"
    >
      <option value="USER">Utilizador</option>
      <option value="ADMIN">Administrador</option>
    </select>
  );
}
