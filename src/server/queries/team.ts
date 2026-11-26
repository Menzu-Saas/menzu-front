import "server-only";

import type { MemberRole } from "@/lib/order-status";
import { canManageRole } from "@/lib/team";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface TeamMember {
  user_id: string;
  role: MemberRole;
  created_at: string;
  full_name: string | null;
  email: string | null;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: MemberRole;
  /** Null when the viewer cannot manage this invite (a MANAGER never receives OWNER invite links). */
  token: string | null;
  expires_at: string;
  created_at: string;
}

/** Members with name and e-mail (definer RPC `team_members`, OWNER/MANAGER). */
export async function getTeamMembers(restaurantId: string): Promise<TeamMember[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("team_members", { p_restaurant_id: restaurantId });
  if (error) throw new Error(`team_members failed: ${error.message}`);
  return (data ?? []) as unknown as TeamMember[];
}

/**
 * Invites not accepted yet (expired ones included, so they can be revoked or re-sent).
 * Tokens of invites the viewer cannot manage are stripped before they reach the client.
 */
export async function getPendingInvites(restaurantId: string, viewerRole: MemberRole): Promise<PendingInvite[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("team_invites")
    .select("id, email, role, token, expires_at, created_at")
    .eq("restaurant_id", restaurantId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load invites: ${error.message}`);
  return (data ?? []).map((invite) => ({
    ...invite,
    token: canManageRole(viewerRole, invite.role) ? invite.token : null,
  })) as PendingInvite[];
}
