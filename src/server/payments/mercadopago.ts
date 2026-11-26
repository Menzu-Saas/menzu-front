import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentStatus } from "@/lib/types";
import {
  PaymentProviderError,
  type CreatePaymentInput,
  type PaymentProvider,
  type ProviderPayment,
  type WebhookRequest,
  type WebhookResult,
} from "./types";

const API = "https://api.mercadopago.com";
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;
const PAYMENT_TTL_MS = 30 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mercado Pago payment status → Menzu payment status. Unknown statuses are never PAID. */
export function mapMercadoPagoStatus(status: unknown): PaymentStatus {
  switch (status) {
    case "approved":
      return "PAID";
    case "pending":
      return "PENDING";
    case "in_process":
    case "authorized":
    case "in_mediation":
      return "PROCESSING";
    case "rejected":
      return "FAILED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

/**
 * Validates the `x-signature` header (`ts=<ts>,v1=<hex>`): HMAC-SHA256 with the webhook secret over
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. Timing-safe compare; stale (> 5 min) is rejected.
 */
export function verifyMercadoPagoSignature(opts: {
  xSignature: string | null | undefined;
  xRequestId: string | null | undefined;
  dataId: string | null | undefined;
  secret: string | null | undefined;
  nowMs?: number;
}): boolean {
  const { xSignature, xRequestId, secret } = opts;
  if (!secret || !xSignature) return false;

  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of xSignature.split(",")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "ts") ts = value;
    else if (key === "v1") v1 = value;
  }
  if (!ts || !/^\d{1,16}$/.test(ts) || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;

  const tsNum = Number(ts);
  const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000; // MP sends seconds; tolerate milliseconds.
  const now = opts.nowMs ?? Date.now();
  if (Math.abs(now - tsMs) > SIGNATURE_MAX_AGE_MS) return false;

  // Alphanumeric ids are signed in lowercase (MP docs). Absent values are left out of the manifest.
  const dataId = opts.dataId ? opts.dataId.toLowerCase() : "";
  let manifest = "";
  if (dataId) manifest += `id:${dataId};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest();
  const received = Buffer.from(v1, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function toReais(cents: number): number {
  return Math.round(cents) / 100;
}

function toCents(amount: unknown): number | null {
  return typeof amount === "number" && Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

/** ISO timestamp with explicit offset, the format MP documents for expiration dates. */
function isoWithOffset(ms: number): string {
  return new Date(ms).toISOString().replace("Z", "+00:00");
}

type MpPayment = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  date_last_updated?: string;
  payment_method_id?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
};

export type MercadoPagoOptions = {
  accessToken: string;
  webhookSecret?: string | null;
  appUrl: string;
  /** Used when the customer gave no e-mail (MP requires a payer e-mail for PIX). */
  defaultPayerEmail?: string | null;
  fetch?: typeof fetch;
  now?: () => number;
};

export class MercadoPagoProvider implements PaymentProvider {
  readonly id = "mercadopago" as const;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly appUrl: string;

  constructor(private readonly opts: MercadoPagoOptions) {
    this.fetchImpl = opts.fetch ?? fetch;
    this.now = opts.now ?? Date.now;
    this.appUrl = opts.appUrl.replace(/\/+$/, "");
  }

  get notificationUrl(): string {
    return `${this.appUrl}/api/webhooks/mercadopago`;
  }

  private async request<T>(
    path: string,
    init: { method: "GET" | "POST" | "PUT"; body?: unknown; idempotencyKey?: string },
  ): Promise<T> {
    const headers = new Headers({
      Authorization: `Bearer ${this.opts.accessToken}`,
      Accept: "application/json",
    });
    if (init.body !== undefined) headers.set("Content-Type", "application/json");
    if (init.idempotencyKey) headers.set("X-Idempotency-Key", init.idempotencyKey);

    let res: Response;
    try {
      res = await this.fetchImpl(`${API}${path}`, {
        method: init.method,
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch (e) {
      throw new PaymentProviderError(`Mercado Pago request failed: ${(e as Error).message}`);
    }
    const text = await res.text();
    if (!res.ok) {
      // Never echo the access token; MP error bodies only contain message/cause.
      throw new PaymentProviderError(`Mercado Pago ${init.method} ${path.split("?")[0]} -> ${res.status}: ${text.slice(0, 300)}`, res.status);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new PaymentProviderError(`Mercado Pago returned invalid JSON (${res.status}).`, res.status);
    }
  }

  private fromPayment(p: MpPayment): ProviderPayment {
    const tx = p.point_of_interaction?.transaction_data;
    const ref = typeof p.external_reference === "string" && UUID_RE.test(p.external_reference) ? p.external_reference : null;
    return {
      provider: this.id,
      providerPaymentId: p.id === undefined || p.id === null ? null : String(p.id),
      status: mapMercadoPagoStatus(p.status),
      externalReference: ref,
      amountCents: toCents(p.transaction_amount),
      pixQrCode: tx?.qr_code || undefined,
      pixQrBase64: tx?.qr_code_base64 || undefined,
      raw: {
        id: p.id ?? null,
        status: p.status ?? null,
        status_detail: p.status_detail ?? null,
        payment_method_id: p.payment_method_id ?? null,
        transaction_amount: p.transaction_amount ?? null,
        date_last_updated: p.date_last_updated ?? null,
        external_reference: p.external_reference ?? null,
        ticket_url: tx?.ticket_url ?? null,
      },
    };
  }

  async createPayment(input: CreatePaymentInput): Promise<ProviderPayment> {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      throw new PaymentProviderError("Invalid amount for an online payment.");
    }
    const [firstName, ...rest] = input.customer.name.trim().split(/\s+/);
    const email = input.customer.email || this.opts.defaultPayerEmail || undefined;
    const expiresAt = isoWithOffset(this.now() + PAYMENT_TTL_MS);

    if (input.method === "PIX") {
      const payment = await this.request<MpPayment>("/v1/payments", {
        method: "POST",
        idempotencyKey: input.paymentId,
        body: {
          transaction_amount: toReais(input.amountCents),
          description: input.description.slice(0, 200),
          payment_method_id: "pix",
          external_reference: input.paymentId,
          notification_url: this.notificationUrl,
          date_of_expiration: expiresAt,
          payer: { email, first_name: firstName, last_name: rest.join(" ") || undefined },
          metadata: { order_id: input.orderId, order_number: input.orderNumber },
        },
      });
      return this.fromPayment(payment);
    }

    // CARD_ONLINE → Checkout Pro preference; the payment is created by MP when the customer pays
    // and arrives via webhook with the same external_reference.
    const back = `${this.appUrl}/pedido/${input.orderId}?token=${encodeURIComponent(input.publicToken)}`;
    const cardType = input.cardType ?? "CREDIT";
    const pref = await this.request<{ id?: string; init_point?: string; sandbox_init_point?: string }>(
      "/checkout/preferences",
      {
        method: "POST",
        idempotencyKey: input.paymentId,
        body: {
          items: [
            {
              id: input.orderId,
              title: input.description.slice(0, 200),
              quantity: 1,
              unit_price: toReais(input.amountCents),
              currency_id: "BRL",
            },
          ],
          payer: { name: firstName, surname: rest.join(" ") || undefined, email },
          external_reference: input.paymentId,
          notification_url: this.notificationUrl,
          back_urls: { success: back, pending: back, failure: back },
          ...(this.appUrl.startsWith("https://") ? { auto_return: "approved" } : {}),
          // shortcut: Checkout Pro cannot exclude account balance; use a card-only gateway when activating payments.
          payment_methods: {
            excluded_payment_types: ["ticket", "atm", "bank_transfer", "digital_currency", "prepaid_card", cardType === "DEBIT" ? "credit_card" : "debit_card"].map((id) => ({ id })),
            installments: 1,
          },
          expires: true,
          expiration_date_to: expiresAt,
          metadata: { order_id: input.orderId, order_number: input.orderNumber },
        },
      },
    );
    const useSandbox = this.opts.accessToken.startsWith("TEST-") && pref.sandbox_init_point;
    const checkoutUrl = useSandbox ? pref.sandbox_init_point : pref.init_point;
    if (!checkoutUrl) throw new PaymentProviderError("Mercado Pago preference without init_point.");
    return {
      provider: this.id,
      providerPaymentId: null,
      status: "PENDING",
      externalReference: input.paymentId,
      amountCents: input.amountCents,
      checkoutUrl,
      raw: { preference_id: pref.id ?? null, card_type: cardType },
    };
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    if (!/^\d{1,20}$/.test(providerPaymentId)) throw new PaymentProviderError("Invalid Mercado Pago payment id.");
    return this.fromPayment(await this.request<MpPayment>(`/v1/payments/${providerPaymentId}`, { method: "GET" }));
  }

  async refundPayment(providerPaymentId: string, amountCents?: number): Promise<ProviderPayment> {
    if (!/^\d{1,20}$/.test(providerPaymentId)) throw new PaymentProviderError("Invalid Mercado Pago payment id.");
    await this.request(`/v1/payments/${providerPaymentId}/refunds`, {
      method: "POST",
      idempotencyKey: `refund-${providerPaymentId}-${amountCents ?? "full"}`,
      body: amountCents === undefined ? {} : { amount: toReais(amountCents) },
    });
    return this.getPayment(providerPaymentId);
  }

  /** PUT /v1/payments/{id} {status:"cancelled"}: only pending / in-process payments can be cancelled. */
  async cancelPayment(providerPaymentId: string): Promise<ProviderPayment> {
    if (!/^\d{1,20}$/.test(providerPaymentId)) throw new PaymentProviderError("Invalid Mercado Pago payment id.");
    return this.fromPayment(
      await this.request<MpPayment>(`/v1/payments/${providerPaymentId}`, { method: "PUT", body: { status: "cancelled" } }),
    );
  }

  private notification(req: WebhookRequest): { type: string | null; dataId: string | null } {
    let body: { type?: unknown; topic?: unknown; data?: { id?: unknown } } = {};
    try {
      body = JSON.parse(req.rawBody || "{}");
    } catch {
      body = {};
    }
    const q = req.url.searchParams;
    const type = q.get("type") ?? q.get("topic") ?? (typeof body.type === "string" ? body.type : null);
    const rawId = q.get("data.id") ?? q.get("id") ?? (body.data?.id === undefined ? null : String(body.data.id));
    return { type, dataId: rawId ? rawId.toLowerCase() : null };
  }

  async validateWebhook(req: WebhookRequest): Promise<boolean> {
    const { dataId } = this.notification(req);
    return verifyMercadoPagoSignature({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId,
      secret: this.opts.webhookSecret,
      nowMs: this.now(),
    });
  }

  async handleWebhook(req: WebhookRequest): Promise<WebhookResult> {
    const { type, dataId } = this.notification(req);
    if (type !== "payment") return { kind: "ignored", reason: `type:${type ?? "unknown"}` };
    if (!dataId || !/^\d{1,20}$/.test(dataId)) return { kind: "ignored", reason: "invalid data.id" };
    // Never trust the body: fetch the authoritative state from the API with our own token.
    const payment = await this.getPayment(dataId);
    const updated = typeof payment.raw.date_last_updated === "string" ? payment.raw.date_last_updated : "";
    return {
      kind: "payment",
      eventId: `payment:${dataId}:${String(payment.raw.status ?? "")}:${updated}`,
      providerPaymentId: dataId,
      paymentId: payment.externalReference,
      status: payment.status,
      amountCents: payment.amountCents,
      raw: payment.raw,
    };
  }

  paymentStatus(raw: unknown): PaymentStatus {
    if (raw && typeof raw === "object" && "status" in raw) return mapMercadoPagoStatus((raw as { status: unknown }).status);
    return mapMercadoPagoStatus(raw);
  }
}
