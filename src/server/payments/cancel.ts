import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { AsaasProvider } from "./asaas-provider";
import { defaultReconcileDeps, refreshAsaasPayment, type ReconcileDeps } from "./asaas-reconciler";
import { getPaymentProvider } from "./index";
import type { PaymentProvider } from "./types";

export type CancelChargesResult = { cancelled: number; refunded: number; failed: number };

/**
 * After an order is cancelled, settles its online payment with the provider:
 * - unpaid charges (PIX, and the Asaas card page) are removed so the buyer can no longer pay them;
 * - with Asaas, charges already PAID are refunded (the money goes back to the buyer, split included).
 * Best effort: the order is already cancelled. Failures are logged and staff still see the payment state.
 * The final REFUNDED state comes from Asaas (webhook or reconciler); it is also re-read right away.
 */
export async function cancelProviderCharges(
  supabase: SupabaseClient<Database>,
  orderId: string,
  provider: PaymentProvider = getPaymentProvider(),
  reconcile: () => ReconcileDeps = defaultReconcileDeps,
): Promise<CancelChargesResult> {
  const result: CancelChargesResult = { cancelled: 0, refunded: 0, failed: 0 };
  if (provider.id !== "mercadopago" && provider.id !== "asaas") return result;
  const { data, error } = await supabase
    .from("payments")
    .select("id, provider_payment_id, method, status")
    .eq("order_id", orderId)
    .eq("provider", provider.id)
    .in("status", ["CANCELLED", "PAID"])
    .not("provider_payment_id", "is", null);
  if (error) {
    console.error("[payments] could not load payments to cancel", { orderId, error: error.message });
    return result;
  }
  for (const p of data ?? []) {
    const providerPaymentId = p.provider_payment_id as string;
    try {
      if (p.status === "PAID") {
        if (!(provider instanceof AsaasProvider)) continue; // Mercado Pago: refund stays manual
        await provider.refundPaymentFor(p.id, providerPaymentId);
        result.refunded++;
        await refreshAsaasPayment(reconcile(), p.id).catch(() => false);
      } else if (provider instanceof AsaasProvider) {
        // Unpaid Pix or card page: removed so nobody pays a cancelled order. Each restaurant has its own key.
        await provider.cancelPaymentFor(p.id, providerPaymentId);
        result.cancelled++;
      } else if (p.method === "PIX") {
        await provider.cancelPayment(providerPaymentId); // Mercado Pago card preferences have nothing to cancel
        result.cancelled++;
      }
    } catch (e) {
      result.failed++;
      console.error("[payments] provider cancel/refund failed", { orderId, paymentId: p.id, status: p.status, error: (e as Error).message });
    }
  }
  return result;
}
