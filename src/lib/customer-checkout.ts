import { safeNextPath } from "@/lib/safe-next";

export function customerCheckoutHref(slug: string): string {
  return `/cardapio/${encodeURIComponent(slug)}/checkout`;
}

export function isCustomerCheckout(value: unknown): boolean {
  const path = safeNextPath(value);
  return Boolean(path && /^\/cardapio\/[a-z0-9-]+\/checkout(?:\?|$)/i.test(path));
}

export function checkoutSignupHref(path: string): string {
  return `/cadastro?next=${encodeURIComponent(safeNextPath(path) ?? "/")}`;
}

export function passwordResetHref(value: unknown): string {
  const next = safeNextPath(value);
  return next ? `/redefinir-senha?next=${encodeURIComponent(next)}` : "/redefinir-senha";
}
