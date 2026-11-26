import "server-only";
import { z } from "zod";
import type { PaymentStatus } from "@/lib/types";
import { AsaasClient } from "./asaas-client";
import { onlineFeePercent } from "./asaas-config";
import {
  PaymentProviderError,
  type CreatePaymentInput,
  type PaymentProvider,
  type ProviderPayment,
  type WebhookResult,
} from "./types";

/** Asaas status → Menzu status. Only RECEIVED/CONFIRMED mean money; anything unknown is never PAID. */
export function mapAsaasStatus(status: unknown): PaymentStatus {
  switch (status) {
    case "RECEIVED":
    case "CONFIRMED":
      return "PAID";
    case "REFUNDED":
      return "REFUNDED";
    case "REFUND_REQUESTED":
    case "REFUND_IN_PROGRESS":
    case "CHARGEBACK_REQUESTED":
    case "CHARGEBACK_DISPUTE":
    case "AWAITING_CHARGEBACK_REVERSAL":
    case "AWAITING_RISK_ANALYSIS":
      return "PROCESSING";
    case "OVERDUE":
      return "CANCELLED";
    default:
      // PENDING, RECEIVED_IN_CASH (manual) and anything new stay pending until confirmed.
      return "PENDING";
  }
}

const toCents = (value: number) => Math.round(value * 100);

/** Calendar day in Brasília, the date Asaas expects for `dueDate`. */
export function brasiliaDate(now: Date, plusDays = 0): string {
  const d = new Date(now.getTime() + plusDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export type AsaasProviderDeps = {
  /** Reads the Menzu payment row (service role). */
  loadPayment(paymentId: string): Promise<{ restaurantId: string; amountCents: number } | null>;
  /** Client authenticated with the restaurant subaccount key. */
  clientFor(restaurantId: string): Promise<AsaasClient | null>;
  platformWalletId: string;
  feePercent?: number;
  now?: () => Date;
};

/**
 * PIX and card charges issued by the restaurant subaccount. Card is paid on Asaas' own page, so no card
 * data reaches Menzu. The platform fee (fixed online payment fee) goes to the platform wallet through the
 * split; the rest stays in the subaccount.
 * Status changes arrive through the webhook inbox and are confirmed by the reconciler, never from here.
 */
export class AsaasProvider implements PaymentProvider {
  readonly id = "asaas" as const;
  constructor(private readonly deps: AsaasProviderDeps) {
    z.uuid().parse(deps.platformWalletId);
  }

  private async clientForPayment(paymentId: string) {
    const row = await this.deps.loadPayment(paymentId);
    if (!row) throw new PaymentProviderError("Payment not found.");
    const client = await this.deps.clientFor(row.restaurantId);
    if (!client) throw new PaymentProviderError("Restaurant has no Asaas account.");
    return { row, client };
  }

  async createPayment(input: CreatePaymentInput): Promise<ProviderPayment> {
    if (input.method !== "PIX" && input.method !== "CARD_ONLINE") throw new PaymentProviderError("Unsupported payment method.");
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new PaymentProviderError("Invalid amount for an online payment.");
    const cpfCnpj = input.customer.cpfCnpj?.replace(/\D/g, "") ?? "";
    if (!/^(\d{11}|\d{14})$/.test(cpfCnpj)) throw new PaymentProviderError("CPF_REQUIRED");

    const { row, client } = await this.clientForPayment(input.paymentId);
    // The amount comes from the database; refuse to charge anything else.
    if (row.amountCents !== input.amountCents) throw new PaymentProviderError("Amount does not match the order.");

    const customer = await client.createCustomer({
      name: input.customer.name, cpfCnpj, externalReference: input.orderId,
      email: input.customer.email ?? undefined,
      mobilePhone: /^\d{10,11}$/.test(input.customer.phone) ? input.customer.phone : undefined,
    });
    const now = (this.deps.now ?? (() => new Date()))();
    const chargeInput = {
      customer: customer.id, amountCents: input.amountCents, dueDate: brasiliaDate(now, 1),
      externalReference: input.paymentId, platformWalletId: this.deps.platformWalletId,
      platformPercent: this.deps.feePercent ?? onlineFeePercent(),
    };
    if (input.method === "CARD_ONLINE") {
      // Card is typed on Asaas' own page: Menzu never sees card data. Always starts PENDING.
      const card = await client.createCardCheckout(chargeInput);
      return {
        provider: this.id, providerPaymentId: card.id, status: "PENDING",
        externalReference: input.paymentId, amountCents: input.amountCents, checkoutUrl: card.invoiceUrl,
        raw: { id: card.id, status: card.status, billing_type: "CREDIT_CARD" },
      };
    }
    const charge = await client.createPixCharge(chargeInput);
    const qr = await this.qrOrCancel(client, charge.id, input.paymentId);
    return {
      provider: this.id, providerPaymentId: charge.id, status: mapAsaasStatus(charge.status),
      externalReference: input.paymentId, amountCents: input.amountCents,
      pixQrCode: qr.payload, pixQrBase64: qr.encodedImage,
      raw: { id: charge.id, status: charge.status, billing_type: "PIX", expiration_date: qr.expirationDate ?? null },
    };
  }

  /**
   * The charge already exists when the QR code is requested. Reading it is safe to repeat; if it still
   * fails, the charge is cancelled so it does not stay loose in Asaas. The buyer never saw a QR code, so
   * nobody can have paid it.
   */
  private async qrOrCancel(client: AsaasClient, chargeId: string, paymentId: string) {
    try {
      return await client.getPixQrCode(chargeId);
    } catch {
      try {
        return await client.getPixQrCode(chargeId);
      } catch (error) {
        try {
          await client.cancelPayment(chargeId);
        } catch {
          console.error("[asaas] Pix charge without QR code could not be cancelled", { payment: paymentId, charge: chargeId });
        }
        throw error;
      }
    }
  }

  private async fromRemote(providerPaymentId: string, client: AsaasClient): Promise<ProviderPayment> {
    const p = await client.getPayment(providerPaymentId);
    return {
      provider: this.id, providerPaymentId: p.id, status: mapAsaasStatus(p.status),
      externalReference: p.externalReference ?? null, amountCents: toCents(p.value),
      raw: { id: p.id, status: p.status, value: p.value, net_value: p.netValue ?? null },
    };
  }

  /** Needs the Menzu payment id because each restaurant has its own subaccount key. */
  async getPaymentFor(paymentId: string, providerPaymentId: string): Promise<ProviderPayment> {
    const { client } = await this.clientForPayment(paymentId);
    return this.fromRemote(providerPaymentId, client);
  }

  /** Removes a charge that was not paid, e.g. the pending PIX of a cancelled order. Never a refund. */
  async cancelPaymentFor(paymentId: string, providerPaymentId: string): Promise<void> {
    const { client } = await this.clientForPayment(paymentId);
    const result = await client.cancelPayment(providerPaymentId);
    if (!result.deleted) throw new PaymentProviderError("Asaas did not remove the charge.");
  }

  /**
   * Gives the money back for a paid charge (cancelled order). Asaas reverses the split too. The final
   * REFUNDED state still comes from Asaas, through the webhook or the reconciler.
   */
  async refundPaymentFor(paymentId: string, providerPaymentId: string): Promise<{ status: string }> {
    const { client } = await this.clientForPayment(paymentId);
    const result = await client.refundPayment(providerPaymentId);
    return { status: result.status };
  }

  async getPayment(): Promise<ProviderPayment> {
    throw new PaymentProviderError("Use getPaymentFor(paymentId, providerPaymentId) with Asaas.");
  }

  async refundPayment(): Promise<ProviderPayment> {
    throw new PaymentProviderError("Asaas refunds are not enabled yet.");
  }

  async cancelPayment(): Promise<ProviderPayment> {
    throw new PaymentProviderError("Asaas cancellation is not enabled yet.");
  }

  async validateWebhook(): Promise<boolean> {
    return false; // Receipt and authentication live in /api/webhooks/asaas.
  }

  async handleWebhook(): Promise<WebhookResult> {
    return { kind: "ignored", reason: "handled by the Asaas inbox reconciler" };
  }

  paymentStatus(raw: unknown): PaymentStatus {
    if (raw && typeof raw === "object" && "status" in raw) return mapAsaasStatus((raw as { status: unknown }).status);
    return mapAsaasStatus(raw);
  }
}




