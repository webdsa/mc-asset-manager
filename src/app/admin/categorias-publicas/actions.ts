"use server";

import { revalidatePath } from "next/cache";
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

export async function setCategoryIsPublicAction(categoryId: string, isPublic: boolean) {
  await requireStaff();
  await prisma.category.update({
    where: { id: categoryId },
    data: { isPublic },
  });
  revalidatePath("/");
  revalidatePath("/admin/categorias-publicas");
}
