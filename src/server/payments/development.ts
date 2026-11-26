import "server-only";
import type { PaymentStatus } from "@/lib/types";
import {
  PaymentProviderError,
  type CreatePaymentInput,
  type PaymentProvider,
  type ProviderPayment,
  type WebhookResult,
} from "./types";

/**
 * Local provider used when Mercado Pago is not configured. It NEVER charges anybody and NEVER
 * reports a payment as PAID: payments stay PENDING until an OWNER/MANAGER uses the dev-only
 * simulate route (`/api/dev/payments/[id]/simulate`), which records `raw.simulated = true`.
 * The database refuses this provider when `menzu_settings.allow_development_payments` is false.
 */
export class DevelopmentPaymentProvider implements PaymentProvider {
  readonly id = "development" as const;

  async createPayment(input: CreatePaymentInput): Promise<ProviderPayment> {
    const base: ProviderPayment = {
      provider: this.id,
      providerPaymentId: `dev_${input.paymentId}`,
      status: "PENDING",
      externalReference: input.paymentId,
      amountCents: input.amountCents,
      raw: {
        development: true,
        note: "Pagamento em modo de desenvolvimento — nenhuma cobrança real.",
        method: input.method,
        ...(input.method === "CARD_ONLINE" ? { card_type: input.cardType ?? "CREDIT" } : {}),
      },
    };
    if (input.method === "PIX") return { ...base, pixQrCode: `DEV-${input.paymentId}` };
    return base;
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    return this.pending(providerPaymentId);
  }

  async refundPayment(providerPaymentId: string): Promise<ProviderPayment> {
    // Nothing was charged, so there is nothing to refund; the status is left to staff tooling.
    return this.pending(providerPaymentId);
  }

  async cancelPayment(providerPaymentId: string): Promise<ProviderPayment> {
    // Nothing was charged; the local row is already CANCELLED by update_order_status.
    return { ...this.pending(providerPaymentId), status: "CANCELLED" };
  }

  async validateWebhook(): Promise<boolean> {
    return false;
  }

  async handleWebhook(): Promise<WebhookResult> {
    throw new PaymentProviderError("The development provider does not receive webhooks.");
  }

  paymentStatus(): PaymentStatus {
    return "PENDING";
  }

  private pending(providerPaymentId: string): ProviderPayment {
    return {
      provider: this.id,
      providerPaymentId,
      status: "PENDING",
      externalReference: null,
      amountCents: null,
      raw: { development: true },
    };
  }
}
