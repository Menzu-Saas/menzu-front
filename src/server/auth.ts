import "server-only";
import { appCookieName } from "@/lib/supabase/session-scope";

import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { MemberRole } from "@/lib/order-status";
import { authDefaultPath, homeForRole, RESTAURANT_ACCESS_PATH } from "@/lib/role-home";
import { safeNextPath } from "@/lib/safe-next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RestaurantStatus } from "@/lib/types";
import { hasRecentRecoveryAmr, RECOVERY_COOKIE, verifyRecoveryCookie } from "@/server/recovery";

export { homeForRole } from "@/lib/role-home";

/** Cookie holding the restaurant the user is currently operating (validated against memberships on every read). */
export const CURRENT_RESTAURANT_COOKIE = appCookieName("mz_rid");

export interface MembershipRestaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: RestaurantStatus;
}

export interface Membership {
  restaurant_id: string;
  role: MemberRole;
  restaurant: MembershipRestaurant;
}

export interface MemberContext {
  user: User;
  restaurantId: string;
  role: MemberRole;
  restaurant: MembershipRestaurant;
}

/** Authenticated user (verified with the Auth server), or null. Deduplicated per request. */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

/**
 * The logged-in user; redirects to /entrar when there is none. Pass the current path as `next`
 * to come back to it after logging in (ignored unless it is a safe same-origin path).
 */
export async function requireUser(next?: string): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    const safe = safeNextPath(next);
    redirect(safe ? `/entrar?next=${encodeURIComponent(safe)}` : "/entrar");
  }
  return user;
}

/** The current user's memberships, oldest first. Empty when logged out. Deduplicated per request. */
export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("restaurant_members")
    .select("restaurant_id, role, created_at, restaurant:restaurants!inner(id, name, slug, logo_url, status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load memberships: ${error.message}`);
  return (data ?? []).map((m) => ({
    restaurant_id: m.restaurant_id,
    role: m.role,
    restaurant: m.restaurant as MembershipRestaurant,
  }));
});

/** Membership selected by the `mz_rid` cookie, falling back to the first one. Null when there is none. */
export async function getCurrentMembership(): Promise<Membership | null> {
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;
  const rid = (await cookies()).get(CURRENT_RESTAURANT_COOKIE)?.value;
  return memberships.find((m) => m.restaurant_id === rid) ?? memberships[0];
}

/**
 * Guard for staff pages and actions. Logged out → /entrar; no restaurant membership → /sem-restaurante;
 * role not in `roles` → the role's own home (homeForRole).
 */
export async function requireMember(roles?: readonly MemberRole[]): Promise<MemberContext> {
  const user = await requireUser();
  const membership = await getCurrentMembership();
  if (!membership) redirect(process.env.MENZU_APP === "restaurant" ? "/sem-restaurante" : "/onboarding");
  if (roles && roles.length > 0 && !roles.includes(membership.role)) {
    redirect(membership.role === "DELIVERY" ? RESTAURANT_ACCESS_PATH : homeForRole(membership.role));
  }
  return {
    user,
    restaurantId: membership.restaurant_id,
    role: membership.role,
    restaurant: membership.restaurant,
  };
}

/**
 * True when the current session is a fresh password-recovery session (see server/recovery.ts:
 * a recent `recovery` amr entry or the signed `menzu_recovery` cookie set by /auth/callback).
 * /redefinir-senha and resetPasswordAction only accept such a session, so a shared,
 * password-logged-in device (e.g. the kitchen tablet) cannot set a new password without the current one.
 */
export async function hasRecoverySession(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return false;
  const claims = data.claims as { amr?: unknown; session_id?: unknown };
  if (hasRecentRecoveryAmr(claims.amr)) return true;
  const sessionId = typeof claims.session_id === "string" ? claims.session_id : undefined;
  return verifyRecoveryCookie((await cookies()).get(RECOVERY_COOKIE)?.value, sessionId);
}

/** Shown when a page acts on a restaurant other than the one selected in this browser (another tab switched it). */
export const STALE_RESTAURANT_ERROR = "Você trocou de restaurante em outra aba. Recarregue a página.";
const FORBIDDEN_ERROR = "Você não tem permissão para esta ação.";

export type MemberOfResult = ({ ok: true } & MemberContext) | { ok: false; error: string };

/**
 * Guard for management actions. `rid` is the restaurant the page was rendered for (never trusted
 * on its own): it must be one of the user's memberships with an allowed role, and still be the
 * restaurant selected in this browser — otherwise a stale tab could write into another restaurant.
 * Logged out → /entrar.
 */
export async function requireMemberOf(rid: unknown, roles: readonly MemberRole[]): Promise<MemberOfResult> {
  const user = await requireUser();
  const memberships = await getMemberships();
  const target = typeof rid === "string" ? memberships.find((m) => m.restaurant_id === rid) : undefined;
  if (!target) return { ok: false, error: STALE_RESTAURANT_ERROR };
  const current = await getCurrentMembership();
  if (current?.restaurant_id !== target.restaurant_id) return { ok: false, error: STALE_RESTAURANT_ERROR };
  if (!roles.includes(target.role)) return { ok: false, error: FORBIDDEN_ERROR };
  return { ok: true, user, restaurantId: target.restaurant_id, role: target.role, restaurant: target.restaurant };
}

/**
 * Persists the current restaurant choice. Callers must have validated the membership first
 * (reads re-validate anyway). Only callable from Server Actions / Route Handlers.
 */
export async function writeCurrentRestaurantCookie(rid: string): Promise<void> {
  (await cookies()).set(CURRENT_RESTAURANT_COOKIE, rid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Default authentication destination belongs to the app that opened the form. */
export async function resolveHomePath(): Promise<string> {
  return authDefaultPath();
}
