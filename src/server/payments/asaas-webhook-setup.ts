import "server-only";
import type { AsaasClient } from "./asaas-client";

/** Events that change a payment. The receiver only stores ids and re-reads the charge from Asaas. */
export const ASAAS_PAYMENT_EVENTS = [
  "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED", "PAYMENT_REFUNDED",
  "PAYMENT_REFUND_IN_PROGRESS", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_AWAITING_CHARGEBACK_REVERSAL", "PAYMENT_AWAITING_RISK_ANALYSIS",
  "PAYMENT_APPROVED_BY_RISK_ANALYSIS", "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
] as const;

/** `EXISTS`/`CREATED`: configured. `NOT_PUBLIC`: no public https address or token yet. `FAILED`: Asaas refused. */
export type WebhookState = "CREATED" | "EXISTS" | "NOT_PUBLIC" | "FAILED";

/** The webhook address, or null when the app has no public https origin (Asaas cannot reach localhost). */
export function asaasWebhookUrl(appUrl: string | undefined): string | null {
  try {
    const url = new URL(appUrl ?? "");
    const host = url.hostname;
    const local = host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || /^[\d.]+$/.test(host) || host.startsWith("[");
    return url.protocol === "https:" && !local && !url.username && !url.password
      ? `${url.origin}/api/webhooks/asaas` : null;
  } catch {
    return null;
  }
}

/**
 * Makes sure an account notifies Menzu. Does nothing without a public https address and a valid token.
 * Lists first so the same address is never registered twice.
 */
export async function ensureWebhook(
  client: AsaasClient,
  { appUrl, token, email }: { appUrl: string | undefined; token: string | undefined; email: string | undefined },
): Promise<WebhookState> {
  const url = asaasWebhookUrl(appUrl);
  if (!url || !token || token.length < 32 || token.length > 255 || /\s/.test(token) || !email) return "NOT_PUBLIC";
  try {
    const existing = await client.listWebhooks();
    if (existing.data.some((hook) => hook.url === url)) return "EXISTS";
    await client.createWebhook({ name: "Menzu pagamentos", url, email, authToken: token, events: ASAAS_PAYMENT_EVENTS });
    return "CREATED";
  } catch {
    return "FAILED";
  }
}
