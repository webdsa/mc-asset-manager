"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Globe, LayoutGrid, LogOut, Menu, Tags, User, Users, X } from "lucide-react";
import type { FirebasePublicConfig } from "@/lib/firebase/public-config";
import { getFirebaseClientAuth } from "@/lib/firebase/client-app";

function isStaffRoleString(role: string): boolean {
  return role === "ADMIN" || role === "OWNER";
}

type Props = {
  firebaseConfig: FirebasePublicConfig;
};

const navLinkClass = (active: boolean) =>
  [
    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
    active
      ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10"
      : "text-slate-300 hover:bg-white/10 hover:text-white",
  ].join(" ");

export function AppSidebar({ firebaseConfig }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      setMobileOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const auth = getFirebaseClientAuth(firebaseConfig);
    return onAuthStateChanged(auth, (user) => {
      setEmail(user?.email ?? null);
      const name = user?.displayName?.trim();
      setDisplayName(name ? name : null);
    });
  }, [firebaseConfig]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/access-status")
      .then(async (res) => {
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          role?: string;
          email?: string | null;
          displayName?: string | null;
        };
        if (cancelled || !data.ok) {
          return;
        }
        if (typeof data.role === "string") {
          setRole(data.role);
        }
        if (data.email) {
          setEmail(data.email);
        }
        const serverName = data.displayName?.trim();
        if (serverName) {
          setDisplayName(serverName);
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleSignOut() {
    const auth = getFirebaseClientAuth(firebaseConfig);
    await signOut(auth);
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const showUsersNav = role != null && isStaffRoleString(role);
  const primaryLabel = displayName ?? email ?? "Sessão ativa";

  const asideNav = (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 lg:py-5">
        <Link
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-white transition hover:text-accent-muted"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-accent-muted ring-1 ring-white/15">
            <LayoutGrid size={18} />
          </span>
          <span className="leading-tight">Asset Manager</span>
        </Link>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Principal">
        {showUsersNav ? (
          <>
            <Link
              href="/admin/usuarios"
              className={`group ${navLinkClass(pathname === "/admin/usuarios" || pathname.startsWith("/admin/usuarios/"))}`}
            >
              <Users size={18} className="shrink-0 text-current opacity-90" />
              Usuários
            </Link>
            <Link
              href="/admin/categorias-publicas"
              className={`group ${navLinkClass(
                pathname === "/admin/categorias-publicas" ||
                  pathname.startsWith("/admin/categorias-publicas/"),
              )}`}
            >
              <Globe size={18} className="shrink-0 text-current opacity-90" />
              Catálogo público
            </Link>
          </>
        ) : null}
        <Link
          href="/categories"
          className={`group ${navLinkClass(pathname === "/categories" || pathname.startsWith("/categories/"))}`}
        >
          <Tags size={18} className="shrink-0 text-current opacity-90" />
          Categorias
        </Link>
      </nav>

      <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-start gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2">
          <User size={16} className="mt-0.5 shrink-0 text-accent-muted" />
          <div className="min-w-0 flex-1">
            <span className="block break-words text-xs font-semibold leading-snug text-white">
              {primaryLabel}
            </span>
            {displayName && email ? (
              <span className="mt-0.5 block break-all text-[11px] leading-snug text-slate-400">{email}</span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-white/10"
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-30 flex min-h-14 items-center gap-3 border-b border-petroleum-900/15 bg-white px-3 pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-petroleum-800 transition hover:bg-petroleum-800/10 active:bg-petroleum-800/15"
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar-panel"
          aria-label={mobileOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <Link
          href="/admin"
          className="min-w-0 truncate text-sm font-semibold text-petroleum-900 transition hover:text-primary"
        >
          Asset Manager
        </Link>
      </header>

      <div
        className={[
          "fixed inset-0 z-40 bg-petroleum-950/45 transition-opacity duration-200 lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        id="app-sidebar-panel"
        className={[
          "fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(18rem,calc(100vw-2.5rem))] max-w-[85vw] flex-col border-r border-white/10 bg-petroleum-800 shadow-xl transition-transform duration-200 ease-out lg:w-56 lg:max-w-none lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none lg:pointer-events-auto",
        ].join(" ")}
      >
        {asideNav}
      </aside>
    </>
  );
}
