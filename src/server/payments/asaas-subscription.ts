import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AsaasClient, isAsaasHostedUrl } from "./asaas-client";
import { asaasEnvironment } from "./asaas-security";

/**
 * Monthly plan (mensalidade) of a restaurant, billed by the Menzu Asaas account (no subaccount, no split).
 * The plan changes only when Asaas confirms a payment; the database applies the existing grace and
 * suspension rules afterwards.
 */
export type SubscriptionPaymentStatus = "pending" | "approved" | "rejected" | "refunded" | "cancelled";

/** Asaas charge status → subscription payment status. Unknown never counts as paid. */
export function subscriptionPaymentStatus(status: string): SubscriptionPaymentStatus {
  switch (status) {
    case "RECEIVED":
    case "CONFIRMED":
    case "RECEIVED_IN_CASH":
      return "approved";
    case "OVERDUE":
      return "rejected";
    case "REFUNDED":
    case "REFUND_IN_PROGRESS":
    case "CHARGEBACK_REQUESTED":
      return "refunded";
    case "DELETED":
      return "cancelled";
    default:
      return "pending";
  }
}

/** The Menzu account, which bills the plans. Null when not configured. */
export function menzuAsaasClient(): AsaasClient | null {
  const key = process.env.ASAAS_API_KEY?.trim();
  return key ? new AsaasClient(key, asaasEnvironment()) : null;
}

/** Applies a subscription charge read from Asaas. Returns what the database did. */
export async function applySubscriptionCharge(
  db: SupabaseClient,
  charge: { id: string; status: string; value: number; subscription: string },
  eventId: string,
): Promise<string> {
  const { data, error } = await db.rpc("apply_asaas_subscription_payment", {
    p_provider_subscription_id: charge.subscription,
    p_provider_payment_id: charge.id,
    p_status: subscriptionPaymentStatus(charge.status),
    p_amount_cents: Math.round(charge.value * 100),
    p_event_id: eventId,
    p_raw: { id: charge.id, status: charge.status, value: charge.value },
  });
  if (error) throw new Error("SUBSCRIPTION_APPLY_FAILED");
  return String(data);
}

/**
 * Safety net for plans: asks Asaas about the charges of every Asaas subscription (also the ones still
 * waiting for their first payment) and applies new states. Repeated runs change nothing.
 */
export async function sweepAsaasSubscriptions(db: SupabaseClient, client: AsaasClient | null): Promise<{ applied: number; failed: number }> {
  const summary = { applied: 0, failed: 0 };
  if (!client) return summary;
  const { data, error } = await db.from("restaurant_subscriptions")
    .select("provider_subscription_id,pending_provider_subscription_id,provider")
    .or("provider.eq.asaas,pending_provider_subscription_id.not.is.null").limit(200);
  if (error) throw new Error("SUBSCRIPTION_STORAGE_UNAVAILABLE");
  const env = asaasEnvironment();
  for (const row of data ?? []) {
    const ids = [row.pending_provider_subscription_id, row.provider === "asaas" ? row.provider_subscription_id : null]
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    for (const subscription of new Set(ids)) {
      try {
        const { data: charges } = await client.listSubscriptionPayments(subscription);
        for (const charge of charges) {
          const result = await applySubscriptionCharge(db, { ...charge, subscription }, `${env}:subsweep:${charge.id}:${charge.status}`);
          if (result !== "duplicate" && result !== "unknown_subscription") summary.applied++;
        }
      } catch {
        summary.failed++;
      }
    }
  }
  return summary;
}

/** Latest open invoice of a subscription, to send the owner to Asaas' payment page. */
export async function openInvoiceUrl(client: AsaasClient, subscription: string): Promise<string | null> {
  const { data } = await client.listSubscriptionPayments(z.string().min(1).parse(subscription));
  const open = data.find((charge) => charge.status === "PENDING" || charge.status === "OVERDUE");
  return open?.invoiceUrl && isAsaasHostedUrl(open.invoiceUrl) ? open.invoiceUrl : null;
}
