/** UID Firebase do dono da aplicação (`ASSET_MANAGER_OWNER_FIREBASE_UID`). */

export function ownerFirebaseUidFromEnv(): string | null {
  const raw = process.env.ASSET_MANAGER_OWNER_FIREBASE_UID?.trim();
  return raw || null;
}

export function isOwnerFirebaseUid(firebaseUid: string): boolean {
  const owner = ownerFirebaseUidFromEnv();
  return owner !== null && owner === firebaseUid;
}
