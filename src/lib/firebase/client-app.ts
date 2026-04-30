"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import type { FirebasePublicConfig } from "@/lib/firebase/public-config";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function getFirebaseClientApp(config: FirebasePublicConfig): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      appId: config.appId,
    });
  } else {
    app = getApps()[0]!;
  }
  return app;
}

export function getFirebaseClientAuth(config: FirebasePublicConfig): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseClientApp(config));
  }
  return auth;
}
