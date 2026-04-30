"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LogOut, User } from "lucide-react";
import type { FirebasePublicConfig } from "@/lib/firebase/public-config";
import { getFirebaseClientAuth } from "@/lib/firebase/client-app";

type Props = {
  firebaseConfig: FirebasePublicConfig;
};

export function AppAuthBar({ firebaseConfig }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseClientAuth(firebaseConfig);
    return onAuthStateChanged(auth, (user) => {
      setEmail(user?.email ?? null);
    });
  }, [firebaseConfig]);

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return null;
  }

  async function handleSignOut() {
    const auth = getFirebaseClientAuth(firebaseConfig);
    await signOut(auth);
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-md backdrop-blur-sm">
      <span className="inline-flex max-w-[200px] items-center gap-1.5 truncate text-slate-700">
        <User size={16} className="shrink-0 text-slate-400" />
        <span className="truncate font-medium">{email ?? "Sessão ativa"}</span>
      </span>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
        title="Sair"
      >
        <LogOut size={14} />
        Sair
      </button>
    </div>
  );
}
