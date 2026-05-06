import type { ItemAuditAction, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function isReactivateFromExcludedMetadata(
  metadata: Prisma.JsonValue | null | undefined,
): boolean {
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }
  return (metadata as { reactivatedFromExcluded?: unknown }).reactivatedFromExcluded === true;
}

const SAO_PAULO_TZ = "America/Sao_Paulo";

/** Formata instante UTC para calendário/relógio no fuso de São Paulo (pt-BR). */
export function formatDateTimeSaoPaulo(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TZ,
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export function formatItemAuditActionLabel(
  action: ItemAuditAction,
  metadata?: Prisma.JsonValue | null,
): string {
  if (action === "UPDATE" && isReactivateFromExcludedMetadata(metadata)) {
    return "Reativação no inventário";
  }
  switch (action) {
    case "CREATE":
      return "Inclusão";
    case "UPDATE":
      return "Edição";
    case "SOFT_DELETE":
      return "Exclusão da lista";
    case "PERMANENT_DELETE":
      return "Exclusão definitiva";
    case "IMAGE_REMOVE":
      return "Remoção de imagem";
    default:
      return action;
  }
}

export type ActorSnapshot = {
  id: string | null;
  email: string | null;
  displayName: string | null;
};

export function actorSnapshotFromUser(user: {
  id: string;
  email: string | null;
  displayName: string | null;
}): ActorSnapshot {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

export function formatActorLabel(log: {
  actorDisplayName: string | null;
  actorEmail: string | null;
  actorUserId: string | null;
}): string {
  const name = log.actorDisplayName?.trim();
  const email = log.actorEmail?.trim();
  if (name && email) {
    return `${name} (${email})`;
  }
  if (email) {
    return email;
  }
  if (name) {
    return name;
  }
  if (log.actorUserId) {
    return `Usuário ${log.actorUserId.slice(0, 8)}…`;
  }
  return "Desconhecido";
}

export async function recordItemAuditLog(options: {
  itemId: string;
  itemName: string | null;
  action: ItemAuditAction;
  actor: ActorSnapshot;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.itemAuditLog.create({
    data: {
      itemId: options.itemId,
      itemNameSnapshot: options.itemName,
      actorUserId: options.actor.id,
      actorEmail: options.actor.email,
      actorDisplayName: options.actor.displayName,
      action: options.action,
      metadata: options.metadata ?? undefined,
    },
  });
}
