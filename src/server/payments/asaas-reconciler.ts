import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AsaasError, type AsaasClient } from "./asaas-client";
import { applySubscriptionCharge, menzuAsaasClient } from "./asaas-subscription";
import { PLATFORM_ONLINE_FEE_BPS } from "./asaas-config";
import { mapAsaasStatus } from "./asaas-provider";
import { asaasEnvironment } from "./asaas-security";
import { asaasStore, restaurantAsaasClient } from "./asaas-store";

export type ReconcileDeps = {
  db: SupabaseClient;
  clientFor(restaurantId: string): Promise<AsaasClient | null>;
  environment: "sandbox" | "production";
  feeBps?: number;
  /** Menzu's own account, which bills the restaurants' monthly plans. */
  menzuClient?: AsaasClient | null;
};

export type ReconcileSummary = { applied: number; duplicate: number; skipped: number; failed: number };

const inboxRow = z.object({
  event_id: z.string(), event_type: z.string(), account_id: z.string().nullable(), resource_id: z.string().nullable(),
});

type RemotePayment = Awaited<ReturnType<AsaasClient["getPayment"]>>;

/** Applies a charge state fetched from Asaas. Returns false when the event id was already applied. */
async function applyRemotePayment(deps: ReconcileDeps, paymentId: string, remote: RemotePayment, eventId: string): Promise<boolean> {
  const feeBps = deps.feeBps ?? PLATFORM_ONLINE_FEE_BPS;
  const grossCents = Math.round(remote.value * 100);
  const status = mapAsaasStatus(remote.status);
  const netCents = typeof remote.netValue === "number" ? Math.round(remote.netValue * 100) : null;
  const paid = status === "PAID" && netCents !== null;
  const { data, error } = await deps.db.rpc("apply_asaas_payment_update", {
    p_payment_id: paymentId,
    p_event_id: eventId,
    p_status: status,
    p_provider_payment_id: remote.id,
    p_raw: { id: remote.id, status: remote.status, value: remote.value, net_value: remote.netValue ?? null },
    // Platform share is a percentage of the net amount (after Asaas fees), as the split does.
    p_gateway_fee_cents: paid ? grossCents - netCents : null,
    p_platform_fee_cents: paid ? Math.floor((netCents * feeBps) / 10_000) : null,
  });
  if (error) throw new Error("ASAAS_APPLY_FAILED");
  return data !== false;
}

/**
 * Re-reads one Asaas charge right away and applies it if its state changed (any state, e.g. after a
 * refund). Same checks as the sweeper: the charge must be ours and for the amount Menzu recorded.
 */
export async function refreshAsaasPayment(deps: ReconcileDeps, paymentId: string): Promise<boolean> {
  const { data: row, error } = await deps.db.from("payments").select("id,restaurant_id,provider_payment_id,amount_cents,status")
    .eq("id", z.uuid().parse(paymentId)).eq("provider", "asaas").maybeSingle();
  if (error) throw new Error("ASAAS_STORAGE_UNAVAILABLE");
  if (!row || typeof row.provider_payment_id !== "string") return false;
  const client = await deps.clientFor(z.uuid().parse(row.restaurant_id));
  if (!client) return false;
  const remote = await client.getPayment(row.provider_payment_id);
  if (remote.externalReference !== row.id || Math.round(remote.value * 100) !== row.amount_cents) return false;
  if (mapAsaasStatus(remote.status) === row.status) return false;
  return applyRemotePayment(deps, row.id, remote, `${deps.environment}:now:${remote.id}:${remote.status}`);
}

/**
 * Safety net that does not depend on webhooks: asks Asaas about every recent charge still open in Menzu
 * and applies any change. Events are keyed by charge and Asaas status, so repeated runs do nothing.
 */
export async function sweepPendingAsaasPayments(
  deps: ReconcileDeps,
  { limit = 50, maxAgeDays = 3, paymentId }: { limit?: number; maxAgeDays?: number; paymentId?: string } = {},
): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = { applied: 0, duplicate: 0, skipped: 0, failed: 0 };
  const since = new Date(Date.now() - maxAgeDays * 86_400_000).toISOString();
  let query = deps.db.from("payments").select("id,restaurant_id,provider_payment_id,amount_cents,status")
    .eq("provider", "asaas").in("status", ["PENDING", "PROCESSING"]).gte("created_at", since);
  if (paymentId) query = query.eq("id", z.uuid().parse(paymentId));
  const { data, error } = await query.order("created_at", { ascending: true }).limit(limit);
  if (error) throw new Error("ASAAS_STORAGE_UNAVAILABLE");

  for (const row of data ?? []) {
    try {
      const restaurantId = z.uuid().safeParse(row.restaurant_id);
      if (!restaurantId.success || typeof row.provider_payment_id !== "string") { summary.skipped++; continue; }
      const client = await deps.clientFor(restaurantId.data);
      if (!client) { summary.failed++; continue; }
      const remote = await client.getPayment(row.provider_payment_id);
      const status = mapAsaasStatus(remote.status);
      // The charge must be ours and for the amount Menzu recorded.
      if (remote.externalReference !== row.id || Math.round(remote.value * 100) !== row.amount_cents) {
        console.error("[asaas] charge does not match a Menzu payment; ignored", { payment: row.id });
        summary.skipped++; continue;
      }
      if (status === row.status) { summary.skipped++; continue; } // nothing changed
      const applied = await applyRemotePayment(deps, row.id, remote, `${deps.environment}:sweep:${remote.id}:${remote.status}`);
      if (applied) summary.applied++; else summary.duplicate++;
    } catch (e) {
      console.error("[asaas] sweep failed", { payment: row.id, error: e instanceof Error ? e.message : "UNKNOWN" });
      summary.failed++;
    }
  }
  return summary;
}

/**
 * Turns received webhook events into order state. The webhook body is never trusted: each charge is
 * fetched from Asaas with the restaurant's own key and must match the Menzu payment (restaurant and
 * amount) before `apply_asaas_payment_update` runs. Failures stay in the inbox for the next run.
 */
export async function reconcileAsaasInbox(deps: ReconcileDeps, limit = 20): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = { applied: 0, duplicate: 0, skipped: 0, failed: 0 };
  const { data, error } = await deps.db.from("asaas_webhook_inbox").select("event_id,event_type,account_id,resource_id")
    .eq("environment", deps.environment).is("processed_at", null).like("event_type", "PAYMENT_%")
    .order("received_at", { ascending: true }).limit(limit);
  if (error) throw new Error("ASAAS_INBOX_UNAVAILABLE");

  const markDone = async (eventId: string) => {
    const { error: e } = await deps.db.from("asaas_webhook_inbox").update({ processed_at: new Date().toISOString() })
      .eq("environment", deps.environment).eq("event_id", eventId);
    if (e) throw new Error("ASAAS_INBOX_UNAVAILABLE");
  };

  for (const raw of data ?? []) {
    const row = inboxRow.safeParse(raw);
    if (!row.success) { summary.failed++; continue; }
    const event = row.data;
    try {
      if (!event.resource_id) { await markDone(event.event_id); summary.skipped++; continue; }
      // Prefer the subaccount id; fall back to the charge id we stored when the charge was created.
      const owner = event.account_id
        ? await deps.db.from("asaas_accounts").select("restaurant_id")
            .eq("environment", deps.environment).eq("account_id", event.account_id).maybeSingle()
        : await deps.db.from("payments").select("restaurant_id")
            .eq("provider", "asaas").eq("provider_payment_id", event.resource_id).maybeSingle();
      if (owner.error) throw new Error("ASAAS_STORAGE_UNAVAILABLE");
      const restaurantId = z.uuid().safeParse(owner.data?.restaurant_id);
      // Not a restaurant charge: it may be a monthly plan billed by the Menzu account itself.
      if (!restaurantId.success) {
        const handled = await subscriptionEvent(deps, event.resource_id, event.event_id);
        await markDone(event.event_id);
        if (handled) summary.applied++; else summary.skipped++;
        continue;
      }
      const client = await deps.clientFor(restaurantId.data);
      if (!client) { summary.failed++; continue; }

      const remote = await client.getPayment(event.resource_id);
      const paymentId = z.uuid().safeParse(remote.externalReference);
      if (!paymentId.success) { await markDone(event.event_id); summary.skipped++; continue; }
      const local = await deps.db.from("payments").select("restaurant_id,amount_cents,provider")
        .eq("id", paymentId.data).maybeSingle();
      if (local.error) throw new Error("ASAAS_STORAGE_UNAVAILABLE");
      const grossCents = Math.round(remote.value * 100);
      const consistent = local.data && local.data.restaurant_id === restaurantId.data
        && local.data.amount_cents === grossCents && ["asaas", "pending"].includes(local.data.provider);
      if (!consistent) {
        console.error("[asaas] event does not match a Menzu payment; ignored", { event: event.event_id });
        await markDone(event.event_id); summary.skipped++; continue;
      }

      const applied = await applyRemotePayment(deps, paymentId.data, remote, `${deps.environment}:${event.event_id}`);
      await markDone(event.event_id);
      if (applied === false) summary.duplicate++; else summary.applied++;
    } catch (e) {
      console.error("[asaas] reconcile failed", { event: event.event_id, error: e instanceof Error ? e.message : "UNKNOWN" });
      summary.failed++;
    }
  }
  return summary;
}

/**
 * A plan charge of the Menzu account. Read from Asaas with the Menzu key, never from the webhook body.
 * A charge Asaas does not know (404) is not ours; other failures are retried.
 */
async function subscriptionEvent(deps: ReconcileDeps, resourceId: string, eventId: string): Promise<boolean> {
  if (!deps.menzuClient) return false;
  let remote: RemotePayment;
  try {
    remote = await deps.menzuClient.getPayment(resourceId);
  } catch (e) {
    if (e instanceof AsaasError && e.status === 404) return false;
    throw e;
  }
  if (!remote.subscription) return false;
  const result = await applySubscriptionCharge(deps.db, { id: remote.id, status: remote.status, value: remote.value, subscription: remote.subscription }, `${deps.environment}:${eventId}`);
  return result !== "unknown_subscription" && result !== "duplicate";
}

/** Production wiring: service-role store, each restaurant's decrypted subaccount key and the Menzu key. */
export function defaultReconcileDeps(): ReconcileDeps {
  return { db: asaasStore(), clientFor: restaurantAsaasClient, environment: asaasEnvironment(), menzuClient: menzuAsaasClient() };
}







