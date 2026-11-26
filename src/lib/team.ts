// Team role rules for the UI (spec §2 role matrix). The database RPCs (create_invite,
// update_member_role, remove_member) remain the authority; this only decides what to show.
import { MEMBER_ROLES, type MemberRole } from "@/lib/order-status";

export const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gerente",
  ATTENDANT: "Atendente",
  KITCHEN: "Cozinha",
  DELIVERY: "Entregador",
};

export const ROLE_DESCRIPTION: Record<MemberRole, string> = {
  OWNER: "Acesso total, inclusive excluir o restaurante",
  MANAGER: "Cardápio, pedidos, relatórios e equipe",
  ATTENDANT: "Pedidos e clientes",
  KITCHEN: "Tela da cozinha",
  DELIVERY: "Área do entregador",
};

export const ROLE_BADGE_TONE: Record<MemberRole, "brand" | "info" | "neutral" | "warning" | "success"> = {
  OWNER: "brand",
  MANAGER: "info",
  ATTENDANT: "neutral",
  KITCHEN: "warning",
  DELIVERY: "success",
};

/** Roles `actor` may grant (invite or change to). Only OWNER grants OWNER. */
export function assignableRoles(actor: MemberRole): MemberRole[] {
  if (actor === "OWNER") return MEMBER_ROLES.filter((r) => r !== "DELIVERY");
  if (actor === "MANAGER") return MEMBER_ROLES.filter((r) => r !== "OWNER" && r !== "DELIVERY");
  return [];
}

/** Whether `actor` may change the role of / remove a member currently holding `target`. */
export function canManageRole(actor: MemberRole, target: MemberRole): boolean {
  if (actor === "OWNER") return true;
  if (actor === "MANAGER") return target !== "OWNER";
  return false;
}

/** Invite link shown to the inviter: `${APP_URL}/convite/{token}`. */
export function inviteUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/+$/, "")}/convite/${encodeURIComponent(token)}`;
}
