import { UserRole } from "@/generated/prisma/client";

export function isStaffRole(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.OWNER;
}

/** Para payloads JSON da API (strings). */
export function isStaffRoleString(role: string): boolean {
  return role === "ADMIN" || role === "OWNER";
}
