"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { FirebasePublicConfig } from "@/lib/firebase/public-config";
import { AppSidebar } from "@/components/app-sidebar";

type Props = {
  firebaseConfig: FirebasePublicConfig;
  children: ReactNode;
};

export function AuthenticatedShell({ firebaseConfig, children }: Props) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return <>{children}</>;
  }

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar firebaseConfig={firebaseConfig} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col pl-0 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:pl-56 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
