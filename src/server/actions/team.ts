"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MANAGEMENT_ROLES } from "@/lib/roles";
import type { MemberRole } from "@/lib/order-status";
import { parseMenzuError } from "@/lib/order-errors";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import { inviteSchema, memberRoleSchema, type InviteInput } from "@/lib/schemas/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assignableRoles, canManageRole, inviteUrl } from "@/lib/team";
import { appUrl } from "@/server/app-url";
import { requireMemberOf } from "@/server/auth";

export type TeamActionResult = { ok: true } | { ok: false; error: string };
export type InviteActionResult =
  | { ok: true; url: string }
  | { ok: false; error?: string; fieldErrors?: FieldErrors };

const FORBIDDEN = "Você não tem permissão para esta ação.";
const uuid = z.string().uuid();

function done(): TeamActionResult {
  revalidatePath("/painel/equipe");
  return { ok: true };
}

/** Creates an invite (token and expiry are set by the database) and returns the link to share. */
export async function inviteMemberAction(rid: string, input: InviteInput): Promise<InviteActionResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { restaurantId, role } = member;
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  if (!assignableRoles(role).includes(parsed.data.role)) {
    return { ok: false, fieldErrors: { role: "Somente proprietários podem convidar outro proprietário." } };
  }

  const supabase = await createSupabaseServerClient();
  const { data: members } = await supabase.rpc("team_members", { p_restaurant_id: restaurantId });
  const already = ((members ?? []) as unknown as { email: string | null }[]).some(
    (m) => m.email?.toLowerCase() === parsed.data.email,
  );
  if (already) return { ok: false, fieldErrors: { email: "Esta pessoa já faz parte da equipe." } };

  const { data: token, error } = await supabase.rpc("create_invite", {
    p_restaurant_id: restaurantId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error || !token) return { ok: false, error: parseMenzuError(error).message };
  revalidatePath("/painel/equipe");
  return { ok: true, url: inviteUrl(await appUrl(), token) };
}

/** Deletes a pending invite of the current restaurant. Managers cannot revoke OWNER invites. */
export async function revokeInviteAction(rid: string, inviteId: string): Promise<TeamActionResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { restaurantId, role } = member;
  if (!uuid.safeParse(inviteId).success) return { ok: false, error: "Convite não encontrado." };
  const supabase = await createSupabaseServerClient();
  const { data: invite } = await supabase
    .from("team_invites")
    .select("id, role")
    .eq("id", inviteId)
    .eq("restaurant_id", restaurantId)
    .is("accepted_at", null)
    .maybeSingle();
  if (!invite) return { ok: false, error: "Convite não encontrado." };
  if (!canManageRole(role, invite.role)) return { ok: false, error: FORBIDDEN };
  const { data, error } = await supabase
    .from("team_invites")
    .delete()
    .eq("id", inviteId)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível revogar o convite." };
  return done();
}

async function targetRole(restaurantId: string, userId: string): Promise<MemberRole | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("restaurant_members")
    .select("role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

/** Changes a teammate's role. Only OWNER touches owners or grants OWNER (re-checked by the RPC). */
export async function changeMemberRoleAction(rid: string, userId: string, nextRole: string): Promise<TeamActionResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { user, restaurantId, role } = member;
  const parsedRole = memberRoleSchema.safeParse(nextRole);
  if (!uuid.safeParse(userId).success || !parsedRole.success) return { ok: false, error: "Dados inválidos." };
  if (userId === user.id) return { ok: false, error: "Você não pode alterar o seu próprio papel." };
  const current = await targetRole(restaurantId, userId);
  if (!current) return { ok: false, error: "Membro não encontrado." };
  if (!canManageRole(role, current) || !assignableRoles(role).includes(parsedRole.data)) {
    return { ok: false, error: "Gerentes não podem alterar proprietários." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_member_role", {
    p_restaurant_id: restaurantId,
    p_user_id: userId,
    p_role: parsedRole.data,
  });
  if (error) return { ok: false, error: parseMenzuError(error).message };
  return done();
}

/** Removes a teammate. Managers cannot remove owners; the last owner can never be removed (RPC). */
export async function removeMemberAction(rid: string, userId: string): Promise<TeamActionResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { user, restaurantId, role } = member;
  if (!uuid.safeParse(userId).success) return { ok: false, error: "Dados inválidos." };
  if (userId === user.id) return { ok: false, error: "Você não pode remover a si mesmo." };
  const current = await targetRole(restaurantId, userId);
  if (!current) return { ok: false, error: "Membro não encontrado." };
  if (!canManageRole(role, current)) return { ok: false, error: "Gerentes não podem remover proprietários." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("remove_member", { p_restaurant_id: restaurantId, p_user_id: userId });
  if (error) return { ok: false, error: parseMenzuError(error).message };
  return done();
}
