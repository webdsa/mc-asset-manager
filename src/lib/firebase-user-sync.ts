import type { DecodedIdToken } from "firebase-admin/auth";
import {
  UserAccessStatus,
  UserRole,
} from "@/generated/prisma/client";
import { isOwnerFirebaseUid } from "@/lib/app-owner";
import { prisma } from "@/lib/prisma";

/**
 * Garante um registo em `User` para o utilizador Firebase.
 * O dono (ASSET_MANAGER_OWNER_FIREBASE_UID) recebe OWNER + APPROVED; os restantes começam como PENDING até um staff aprovar.
 */
export async function syncFirebaseUserFromDecoded(decoded: DecodedIdToken) {
  const owner = isOwnerFirebaseUid(decoded.uid);

  return prisma.user.upsert({
    where: { firebaseUid: decoded.uid },
    create: {
      firebaseUid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      role: owner ? UserRole.OWNER : UserRole.USER,
      accessStatus: owner ? UserAccessStatus.APPROVED : UserAccessStatus.PENDING,
      ...(owner ? { approvedAt: new Date() } : {}),
    },
    update: {
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      ...(owner
        ? {
            role: UserRole.OWNER,
            accessStatus: UserAccessStatus.APPROVED,
            approvedAt: new Date(),
          }
        : {}),
    },
  });
}
