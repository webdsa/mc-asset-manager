import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function parseServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set.");
  }
  return JSON.parse(raw) as ServiceAccount;
}

/** `project_id` inside the service account JSON (must match the web app's Firebase project). */
export function getServiceAccountProjectId(): string | null {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
    if (!raw) {
      return null;
    }
    const j = JSON.parse(raw) as { project_id?: string; projectId?: string };
    const id = j.project_id ?? j.projectId;
    return typeof id === "string" && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

let adminApp: App | undefined;

export function getFirebaseAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }
  adminApp = initializeApp({
    credential: cert(parseServiceAccount()),
  });
  return adminApp;
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}
