"use server";

import { revalidatePath } from "next/cache";
import { UserAccessStatus, UserRole } from "@/generated/prisma/client";
import { isOwnerFirebaseUid } from "@/lib/app-owner";
import { getAppUser } from "@/lib/auth-user";
import { isStaffRole } from "@/lib/staff-role";
import { prisma } from "@/lib/prisma";

async function requireStaff() {
  const u = await getAppUser();
  if (!u || !isStaffRole(u.role)) {
    throw new Error("Não autorizado.");
  }
  return u;
}

export async function approveUserAction(formData: FormData) {
  const staff = await requireStaff();
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("Pedido inválido.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessStatus: UserAccessStatus.APPROVED,
      approvedAt: new Date(),
      approvedByUserId: staff.id,
    },
  });

  revalidatePath("/admin/usuarios");
}

export async function revokeUserAction(formData: FormData) {
  const staff = await requireStaff();
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("Pedido inválido.");
  }

  if (userId === staff.id) {
    throw new Error("Não é possível revogar o próprio utilizador.");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, firebaseUid: true },
  });
  if (target?.role === UserRole.OWNER || (target && isOwnerFirebaseUid(target.firebaseUid))) {
    throw new Error("Não é possível revogar o dono da aplicação.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessStatus: UserAccessStatus.REVOKED,
      approvedAt: null,
      approvedByUserId: null,
    },
  });

  revalidatePath("/admin/usuarios");
}

export async function setUserRoleAction(formData: FormData) {
  await requireStaff();

  const userId = formData.get("userId");
  const roleRaw = formData.get("role");
  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("Pedido inválido.");
  }
  if (roleRaw !== "USER" && roleRaw !== "ADMIN") {
    throw new Error("Perfil inválido.");
  }

  const nextRole = roleRaw === "ADMIN" ? UserRole.ADMIN : UserRole.USER;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, firebaseUid: true },
  });
  if (!target) {
    throw new Error("Utilizador não encontrado.");
  }
  if (target.role === UserRole.OWNER || isOwnerFirebaseUid(target.firebaseUid)) {
    throw new Error("O perfil do dono não pode ser alterado aqui.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: nextRole },
  });

  revalidatePath("/admin/usuarios");
}
