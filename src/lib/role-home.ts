import type { MemberRole } from "@/lib/order-status";
import { SERVICE_ROLES } from "@/lib/roles";

export { DELIVERY_ROLES, KITCHEN_ROLES } from "@/lib/roles";

export const RESTAURANT_ACCESS_PATH = "/acessar";

export function authDefaultPath(): string {
  return RESTAURANT_ACCESS_PATH;
}

/** Roles allowed into the admin panel (/painel); alias of `SERVICE_ROLES`. */
export const ADMIN_ROLES = SERVICE_ROLES;

/** Kitchen staff use the kitchen; individual courier access is unavailable. */
export function homeForRole(role: MemberRole): string {
  if (role === "KITCHEN") return "/cozinha";
  if (role === "DELIVERY") return "/sem-restaurante";
  return "/painel";
}

/** Routes protected by the proxy (redirect to /entrar?next=… when logged out). */
export const PROTECTED_PREFIXES = ["/painel", "/cozinha", "/entregas", "/onboarding"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
