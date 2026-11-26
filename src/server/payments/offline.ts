import "server-only";
import type { PaymentMethod } from "@/lib/types";
import type { OfflinePaymentMethod, OnlinePaymentMethod } from "./types";

// Offline methods (CASH, CARD_ON_DELIVERY) never touch a provider: create_order writes the payment
// row as PENDING with provider 'offline' and staff mark it PAID at delivery (mark_payment_paid RPC).
export const OFFLINE_PROVIDER = "offline";

export function isOfflineMethod(method: PaymentMethod): method is OfflinePaymentMethod {
  return method === "CASH" || method === "CARD_ON_DELIVERY";
}

export function isOnlineMethod(method: PaymentMethod): method is OnlinePaymentMethod {
  return method === "PIX" || method === "CARD_ONLINE";
}
