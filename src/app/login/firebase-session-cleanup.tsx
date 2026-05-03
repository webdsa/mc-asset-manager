"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import type { FirebasePublicConfig } from "@/lib/firebase/public-config";
import { getFirebaseClientAuth } from "@/lib/firebase/client-app";

type Props = {
  firebaseConfig: FirebasePublicConfig;
  /** Vindo de `/login?sair=1` → proxy define `encerrar=1` e limpa o cookie; aqui fecha a sessão Firebase no cliente. */
  active: boolean;
};

export function FirebaseSessionCleanup({ firebaseConfig, active }: Props) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!active || ran.current) {
      return;
    }
    ran.current = true;
    const auth = getFirebaseClientAuth(firebaseConfig);
    void (async () => {
      try {
        await signOut(auth);
      } catch {
        // já sem sessão Firebase
      }
      try {
        await fetch("/api/auth/session", { method: "DELETE" });
      } catch {
        // cookie já pode estar ausente
      }
      router.replace("/login");
    })();
  }, [active, firebaseConfig, router]);

  return null;
}
