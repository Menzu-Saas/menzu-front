import "server-only";
import type { PaymentMethod, PaymentStatus } from "@/lib/types";
import type { CardType } from "@/lib/schemas/order";

export type OnlinePaymentMethod = Extract<PaymentMethod, "PIX" | "CARD_ONLINE">;
export type OfflinePaymentMethod = Extract<PaymentMethod, "CASH" | "CARD_ON_DELIVERY">;
export type PaymentProviderId = "mercadopago" | "asaas" | "development";

export type CreatePaymentInput = {
  /** Menzu payment row id. Used as external reference and idempotency key. */
  paymentId: string;
  orderId: string;
  orderNumber: number;
  publicToken: string;
  method: OnlinePaymentMethod;
  cardType?: CardType;
  amountCents: number;
  description: string;
  /** `cpfCnpj` (digits only) is required by Asaas and never stored by Menzu. */
  customer: { name: string; phone: string; email?: string | null; cpfCnpj?: string | null };
};

export type ProviderPayment = {
  provider: PaymentProviderId;
  /** Provider-side payment id (null when the provider has not created a payment yet, e.g. a checkout preference). */
  providerPaymentId: string | null;
  status: PaymentStatus;
  /** Menzu payment id echoed back by the provider (external_reference). */
  externalReference: string | null;
  amountCents: number | null;
  pixQrCode?: string;
  pixQrBase64?: string;
  checkoutUrl?: string;
  raw: Record<string, unknown>;
};

export type WebhookRequest = {
  headers: Headers;
  url: URL;
  rawBody: string;
};

export type WebhookResult =
  | {
      kind: "payment";
      /** Stable id for idempotency (payment_events unique key). */
      eventId: string;
      providerPaymentId: string;
      /** Menzu payment id (external_reference) — null if the provider payment is not ours. */
      paymentId: string | null;
      status: PaymentStatus;
      amountCents: number | null;
      raw: Record<string, unknown>;
    }
  | { kind: "ignored"; reason: string };

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createPayment(input: CreatePaymentInput): Promise<ProviderPayment>;
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  refundPayment(providerPaymentId: string, amountCents?: number): Promise<ProviderPayment>;
  /** Cancels a payment that was not paid yet (e.g. a pending PIX of a cancelled order). */
  cancelPayment(providerPaymentId: string): Promise<ProviderPayment>;
  validateWebhook(req: WebhookRequest): Promise<boolean>;
  handleWebhook(req: WebhookRequest): Promise<WebhookResult>;
  /** Maps a provider status (or raw provider payload) to a Menzu payment status. */
  paymentStatus(raw: unknown): PaymentStatus;
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
