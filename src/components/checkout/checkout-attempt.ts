import { isUuid } from "@/lib/uuid";

export type CheckoutAttempt = { fingerprint: string; key: string; pending?: boolean; accepted?: boolean };
const storageKey = (userId: string, slug: string) => `menzu-checkout-attempt:${userId}:${slug}`;

export function loadCheckoutAttempt(userId: string, slug: string): CheckoutAttempt | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(userId, slug)) ?? "null");
    if (isUuid(saved?.key) && typeof saved.fingerprint === "string") {
      return { fingerprint: saved.fingerprint, key: saved.key, pending: saved.pending === true, accepted: saved.accepted === true };
    }
  } catch { /* Storage may be unavailable; the mounted checkout keeps its attempt in memory. */ }
  return null;
}

export async function checkoutAttempt(userId: string, slug: string, payload: unknown, previous?: CheckoutAttempt | null): Promise<CheckoutAttempt> {
  if (previous?.pending) return previous;
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const fingerprint = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
  if (previous?.fingerprint === fingerprint) return previous;
  const saved = loadCheckoutAttempt(userId, slug);
  if (saved && (saved.pending || saved.fingerprint === fingerprint)) return saved;
  const attempt = { fingerprint, key: crypto.randomUUID() };
  saveCheckoutAttempt(userId, slug, attempt);
  return attempt;
}

export function saveCheckoutAttempt(userId: string, slug: string, attempt: CheckoutAttempt) {
  try { sessionStorage.setItem(storageKey(userId, slug), JSON.stringify(attempt)); } catch { /* The mounted checkout keeps its attempt in memory. */ }
}

export function clearCheckoutAttempt(userId: string, slug: string): void {
  try { sessionStorage.removeItem(storageKey(userId, slug)); } catch { /* A completed order must still navigate. */ }
}
