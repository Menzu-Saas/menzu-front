import "server-only";
import { z } from "zod";

const cents = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const reference = z.string().trim().min(1).max(100);
const subaccount = z.object({
  name: z.string().trim().min(2), email: z.email(), cpfCnpj: z.string().regex(/^\d{11}$|^\d{14}$/),
  mobilePhone: z.string().regex(/^\d{10,11}$/), incomeValue: z.number().nonnegative().finite(),
  address: z.string().trim().min(1), addressNumber: z.string().trim().min(1),
  province: z.string().trim().min(1), postalCode: z.string().regex(/^\d{8}$/),
  birthDate: z.iso.date().optional(), companyType: z.enum(["MEI", "LIMITED", "INDIVIDUAL", "ASSOCIATION"]).optional(),
}).superRefine((value, ctx) => {
  if (value.cpfCnpj.length === 11 && !value.birthDate) ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Informe a data de nascimento." });
  if (value.cpfCnpj.length === 14 && !value.companyType) ctx.addIssue({ code: "custom", path: ["companyType"], message: "Informe o tipo de empresa." });
});
const paymentId = z.string().regex(/^[A-Za-z0-9_]{1,64}$/);
const customer = z.object({
  name: z.string().trim().min(2).max(100), cpfCnpj: z.string().regex(/^\d{11}$|^\d{14}$/),
  email: z.email().optional(), mobilePhone: z.string().regex(/^\d{10,11}$/).optional(),
  externalReference: reference.optional(), notificationDisabled: z.boolean().default(true),
});
const charge = z.object({
  customer: z.string().regex(/^cus_[a-zA-Z0-9]+$/), amountCents: cents,
  dueDate: z.iso.date(), externalReference: reference,
  platformWalletId: z.uuid(), platformPercent: z.number().min(0).max(100).multipleOf(0.0001),
});
/** The buyer is redirected here, so it must be an https Asaas address and nothing else. */
export function isAsaasHostedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && (url.hostname === "asaas.com" || url.hostname.endsWith(".asaas.com"));
  } catch { return false; }
}
const hostedUrl = z.string().max(2000).refine(isAsaasHostedUrl, "Invalid Asaas payment page.");
const withdrawal = z.object({
  amountCents: cents, externalReference: reference,
  pixAddressKey: z.string().trim().min(1).max(200),
  pixAddressKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"]),
}).superRefine((value, ctx) => {
  const key = value.pixAddressKey;
  const valid = value.pixAddressKeyType === "EMAIL" ? z.email().safeParse(key).success
    : value.pixAddressKeyType === "EVP" ? z.uuid().safeParse(key).success
    : new RegExp(`^\\d{${value.pixAddressKeyType === "CNPJ" ? 14 : 11}}$`).test(key);
  if (!valid) ctx.addIssue({ code: "custom", path: ["pixAddressKey"], message: "Chave Pix inválida." });
});

export class AsaasError extends Error {
  constructor(readonly code: "NOT_CONFIGURED" | "REQUEST_FAILED" | "UNKNOWN_RESULT" | "INVALID_RESPONSE", readonly status?: number) {
    super(`Asaas: ${code}`);
  }
}

/** Server-only transport. The caller owns tenant authorization and durable operation deduplication. */
export class AsaasClient {
  private readonly baseUrl: string;
  constructor(private readonly apiKey: string, environment: "sandbox" | "production" = "sandbox", private readonly transport: typeof fetch = fetch) {
    if (!apiKey.trim()) throw new AsaasError("NOT_CONFIGURED");
    if (!["sandbox", "production"].includes(environment)) throw new AsaasError("NOT_CONFIGURED");
    this.baseUrl = environment === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
  }

  private async request<T>(path: string, schema: z.ZodType<T>, body?: unknown, method?: "DELETE"): Promise<T> {
    let response: Response;
    try {
      response = await this.transport(this.baseUrl + path, {
        method: method ?? (body === undefined ? "GET" : "POST"),
        headers: { access_token: this.apiKey, "User-Agent": "Menzu/0.1-beta", "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
      });
    } catch {
      // A timed-out POST may have succeeded; the caller must reconcile instead of retrying blindly.
      throw new AsaasError(body === undefined ? "REQUEST_FAILED" : "UNKNOWN_RESULT");
    }
    if (!response.ok) throw new AsaasError(response.status >= 500 && body !== undefined ? "UNKNOWN_RESULT" : "REQUEST_FAILED", response.status);
    let data: unknown;
    try { data = await response.json(); } catch { throw new AsaasError(body === undefined ? "INVALID_RESPONSE" : "UNKNOWN_RESULT"); }
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new AsaasError(body === undefined ? "INVALID_RESPONSE" : "UNKNOWN_RESULT");
    return parsed.data;
  }

  /** Use the parent-account key; apiKey is returned once and must never reach the browser. */
  createSubaccount(input: z.input<typeof subaccount>) {
    return this.request("/accounts", z.object({ id: z.string().min(1), walletId: z.uuid(), apiKey: z.string().min(1) }), subaccount.parse(input));
  }

  /** Instantiate with the restaurant subaccount key, never the parent key. */
  async getBalanceCents(): Promise<number> {
    const result = await this.request("/finance/balance", z.object({ balance: z.number().nonnegative().finite() }));
    const value = Math.round(result.balance * 100);
    if (!Number.isSafeInteger(value)) throw new AsaasError("INVALID_RESPONSE");
    return value;
  }

  getStatement() {
    return this.request("/financialTransactions?limit=20&offset=0", z.object({
      data: z.array(z.object({ id: z.string(), date: z.string(), description: z.string().nullish(), value: z.number().finite(), type: z.string() })),
      hasMore: z.boolean(),
    }));
  }

  /** Charge belongs to the restaurant; only the platform share goes to its wallet. */
  createPixCharge(input: z.input<typeof charge>) {
    const value = charge.parse(input);
    return this.request("/payments", z.object({ id: z.string().min(1), status: z.string().min(1) }), {
      customer: value.customer, billingType: "PIX", value: value.amountCents / 100,
      dueDate: value.dueDate, externalReference: value.externalReference,
      split: value.platformPercent === 0 ? [] : [{ walletId: value.platformWalletId, percentualValue: value.platformPercent }],
    });
  }

  /**
   * Card charge paid on Asaas' own payment page (invoiceUrl): no card data ever touches Menzu. Same
   * split as PIX. The buyer is sent to the returned page.
   */
  createCardCheckout(input: z.input<typeof charge>) {
    const value = charge.parse(input);
    return this.request("/payments", z.object({ id: z.string().min(1), status: z.string().min(1), invoiceUrl: hostedUrl }), {
      customer: value.customer, billingType: "CREDIT_CARD", value: value.amountCents / 100,
      dueDate: value.dueDate, externalReference: value.externalReference,
      split: value.platformPercent === 0 ? [] : [{ walletId: value.platformWalletId, percentualValue: value.platformPercent }],
    });
  }

  /** Customer of the restaurant subaccount. Asaas requires CPF/CNPJ to issue a charge. */
  createCustomer(input: z.input<typeof customer>) {
    return this.request("/customers", z.object({ id: z.string().regex(/^cus_[a-zA-Z0-9]+$/) }), customer.parse(input));
  }

  /** Authoritative charge state. Never trust a webhook payload instead of this. */
  getPayment(id: string) {
    return this.request(`/payments/${paymentId.parse(id)}`, z.object({
      id: z.string().min(1), status: z.string().min(1), value: z.number().nonnegative().finite(),
      netValue: z.number().nonnegative().finite().nullish(), billingType: z.string().nullish(),
      externalReference: z.string().nullish(),
      // Set when the charge belongs to a subscription (the restaurant's monthly plan).
      subscription: z.string().nullish(),
    }));
  }

  /**
   * Monthly plan charged by the Menzu account. billingType UNDEFINED lets the customer choose Pix, boleto or
   * card on Asaas' own invoice page.
   */
  createSubscription(input: { customer: string; amountCents: number; nextDueDate: string; description: string; externalReference: string }) {
    const value = z.object({
      customer: z.string().regex(/^cus_[a-zA-Z0-9]+$/), amountCents: cents, nextDueDate: z.iso.date(),
      description: z.string().trim().min(1).max(500), externalReference: reference,
    }).parse(input);
    return this.request("/subscriptions", z.object({ id: z.string().min(1), status: z.string().min(1) }), {
      customer: value.customer, billingType: "UNDEFINED", cycle: "MONTHLY", value: value.amountCents / 100,
      nextDueDate: value.nextDueDate, description: value.description, externalReference: value.externalReference,
    });
  }

  /** Charges generated by a subscription, most recent first. */
  listSubscriptionPayments(subscriptionId: string) {
    return this.request(`/subscriptions/${paymentId.parse(subscriptionId)}/payments?limit=12`, z.object({
      data: z.array(z.object({
        id: z.string().min(1), status: z.string().min(1), value: z.number().nonnegative().finite(),
        dueDate: z.string().nullish(), invoiceUrl: z.string().nullish(),
      })),
    }));
  }

  /** Webhooks of this account. Asaas configures them per account, so each subaccount needs its own. */
  listWebhooks() {
    return this.request("/webhooks?limit=100", z.object({
      data: z.array(z.object({ id: z.string().min(1), url: z.string(), enabled: z.boolean(), interrupted: z.boolean().nullish() })),
    }));
  }

  createWebhook(input: { name: string; url: string; email: string; authToken: string; events: readonly string[] }) {
    return this.request("/webhooks", z.object({ id: z.string().min(1) }), {
      ...input, enabled: true, interrupted: false, sendType: "SEQUENTIALLY", apiVersion: 3,
    });
  }

  /** Pix keys of this account. Without an active one, Asaas refuses to produce a charge QR code. */
  listPixKeys() {
    return this.request("/pix/addressKeys?limit=20", z.object({
      data: z.array(z.object({ id: z.string().min(1), status: z.string().min(1), type: z.string().nullish() })),
    }));
  }

  /** Random (EVP) key: carries no personal data. */
  createRandomPixKey() {
    return this.request("/pix/addressKeys", z.object({ id: z.string().min(1), status: z.string().min(1) }), { type: "EVP" });
  }

  getPixQrCode(id: string) {
    return this.request(`/payments/${paymentId.parse(id)}/pixQrCode`, z.object({
      encodedImage: z.string().min(1), payload: z.string().min(1), expirationDate: z.string().nullish(),
    }));
  }

  refundPayment(id: string) {
    return this.request(`/payments/${paymentId.parse(id)}/refund`, z.object({ id: z.string().min(1), status: z.string().min(1) }), {});
  }

  /** Only charges not yet paid can be removed. */
  cancelPayment(id: string) {
    return this.request(`/payments/${paymentId.parse(id)}`, z.object({ deleted: z.boolean() }), undefined, "DELETE");
  }

  /** Returns requested status, not a claim of settled funds. No automatic POST retries. */
  requestPixWithdrawal(input: z.input<typeof withdrawal>) {
    const value = withdrawal.parse(input);
    return this.request("/transfers", z.object({ id: z.string().min(1), status: z.string().min(1) }), {
      value: value.amountCents / 100, operationType: "PIX", externalReference: value.externalReference,
      pixAddressKey: value.pixAddressKey, pixAddressKeyType: value.pixAddressKeyType,
    });
  }
}








