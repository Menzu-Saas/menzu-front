import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AsaasClient, isAsaasHostedUrl } from "@/server/payments/asaas-client";
import { AsaasProvider, brasiliaDate, mapAsaasStatus } from "@/server/payments/asaas-provider";

const wallet = "123e4567-e89b-42d3-a456-426614174000";
const paymentId = "9b2f0f64-1c3a-4a53-8d2b-6f1f3c0a1111";
const base = { paymentId, orderId: "o-1", orderNumber: 7, publicToken: "t", method: "PIX" as const, amountCents: 5000, description: "Pedido #7" };
const customer = { name: "Maria Silva", phone: "81999999999", cpfCnpj: "123.456.789-01" };

function setup(amountCents = 5000) {
  const transport = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/customers")) return Response.json({ id: "cus_1" });
    if (url.endsWith("/payments")) {
      const card = JSON.parse(String(init?.body)).billingType === "CREDIT_CARD";
      return Response.json(card ? { id: "pay_card", status: "PENDING", invoiceUrl: "https://sandbox.asaas.com/i/abc123" } : { id: "pay_1", status: "PENDING" });
    }
    if (url.endsWith("/pixQrCode")) return Response.json({ encodedImage: "BASE64", payload: "000201PIX", expirationDate: "2026-11-25 23:59:59" });
    throw new Error("unexpected " + url + init?.method);
  });
  const client = new AsaasClient("sub-key", "sandbox", transport as unknown as typeof fetch);
  const provider = new AsaasProvider({
    platformWalletId: wallet,
    loadPayment: async () => ({ restaurantId: "r-1", amountCents }),
    clientFor: async () => client,
    now: () => new Date("2026-11-24T15:00:00Z"),
  });
  return { provider, transport };
}

describe("AsaasProvider", () => {
  it("creates a PIX charge with the 3.5% platform split and returns the QR code", async () => {
    const { provider, transport } = setup();
    const result = await provider.createPayment({ ...base, customer });
    expect(result).toMatchObject({ provider: "asaas", providerPaymentId: "pay_1", status: "PENDING", pixQrCode: "000201PIX", pixQrBase64: "BASE64", externalReference: paymentId });
    const charge = transport.mock.calls.find(([url]) => (url as string).endsWith("/payments"))!;
    expect(JSON.parse(charge[1]!.body as string)).toMatchObject({ customer: "cus_1", billingType: "PIX", value: 50, dueDate: "2026-11-25", externalReference: paymentId, split: [{ walletId: wallet, percentualValue: 3.5 }] });
    const cust = transport.mock.calls.find(([url]) => (url as string).endsWith("/customers"))!;
    expect(JSON.parse(cust[1]!.body as string)).toMatchObject({ cpfCnpj: "12345678901", notificationDisabled: true });
  });

  describe("when the QR code cannot be read", () => {
    function failingQr(qrFailures: number) {
      let reads = 0;
      const transport = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith("/customers")) return Response.json({ id: "cus_1" });
        if (url.endsWith("/pixQrCode")) return ++reads > qrFailures ? Response.json({ encodedImage: "B", payload: "P" }) : Response.json({ errors: [] }, { status: 400 });
        if (init?.method === "DELETE") return Response.json({ deleted: true });
        return Response.json({ id: "pay_1", status: "PENDING" });
      });
      const provider = new AsaasProvider({
        platformWalletId: wallet,
        loadPayment: async () => ({ restaurantId: "r-1", amountCents: 5000 }),
        clientFor: async () => new AsaasClient("k", "sandbox", transport as unknown as typeof fetch),
      });
      const calls = (method: string) => transport.mock.calls.filter(([, init]) => init?.method === method);
      return { provider, calls };
    }

    it("cancels the charge so it does not stay loose, without creating another", async () => {
      const { provider, calls } = failingQr(2);
      await expect(provider.createPayment({ ...base, customer })).rejects.toThrow();
      expect(calls("DELETE").map(([url]) => url)).toEqual(["https://api-sandbox.asaas.com/v3/payments/pay_1"]);
      expect(calls("POST").filter(([url]) => (url as string).endsWith("/payments"))).toHaveLength(1);
    });

    it("keeps the charge when the second read works", async () => {
      const { provider, calls } = failingQr(1);
      await expect(provider.createPayment({ ...base, customer })).resolves.toMatchObject({ providerPaymentId: "pay_1", pixQrCode: "P" });
      expect(calls("DELETE")).toHaveLength(0);
    });
  });

  it("sends card buyers to Asaas' own page, with the split and no card data", async () => {
    const transport = vi.fn(async (url: string, _init?: RequestInit) => url.endsWith("/customers")
      ? Response.json({ id: "cus_1" }) : Response.json({ id: "pay_card", status: "PENDING", invoiceUrl: "https://sandbox.asaas.com/i/abc" }));
    const provider = new AsaasProvider({
      platformWalletId: wallet,
      loadPayment: async () => ({ restaurantId: "r-1", amountCents: 5000 }),
      clientFor: async () => new AsaasClient("k", "sandbox", transport as unknown as typeof fetch),
    });
    const result = await provider.createPayment({ ...base, method: "CARD_ONLINE", customer });
    expect(result).toMatchObject({ status: "PENDING", providerPaymentId: "pay_card", checkoutUrl: "https://sandbox.asaas.com/i/abc" });
    const charge = transport.mock.calls.find(([url]) => (url as string).endsWith("/payments"))!;
    const body = JSON.parse((charge[1] as RequestInit).body as string);
    expect(body).toMatchObject({ billingType: "CREDIT_CARD", split: [{ walletId: wallet, percentualValue: 3.5 }] });
    expect(JSON.stringify(body)).not.toMatch(/creditCard"|holderName|ccv/);
  });

  it("refuses a card page that is not an Asaas https address", async () => {
    for (const bad of ["http://sandbox.asaas.com/i/x", "https://evil.example/i/x", "https://asaas.com.evil.example/x", "https://u@sandbox.asaas.com/x"]) expect(isAsaasHostedUrl(bad)).toBe(false);
    const transport = vi.fn(async (url: string) => url.endsWith("/customers") ? Response.json({ id: "cus_1" }) : Response.json({ id: "p", status: "PENDING", invoiceUrl: "https://evil.example/i/x" }));
    const provider = new AsaasProvider({ platformWalletId: wallet, loadPayment: async () => ({ restaurantId: "r-1", amountCents: 5000 }), clientFor: async () => new AsaasClient("k", "sandbox", transport as unknown as typeof fetch) });
    await expect(provider.createPayment({ ...base, method: "CARD_ONLINE", customer })).rejects.toThrow();
  });

  it("refuses missing CPF and an amount that differs from the database", async () => {
    const { provider, transport } = setup();
    await expect(provider.createPayment({ ...base, customer: { ...customer, cpfCnpj: null } })).rejects.toThrow("CPF_REQUIRED");
    expect(transport).not.toHaveBeenCalled();
    await expect(setup(4999).provider.createPayment({ ...base, customer })).rejects.toThrow("Amount does not match");
  });

  it("only RECEIVED and CONFIRMED mean paid; unknown never does", () => {
    expect(mapAsaasStatus("RECEIVED")).toBe("PAID");
    expect(mapAsaasStatus("CONFIRMED")).toBe("PAID");
    for (const s of ["PENDING", "RECEIVED_IN_CASH", "SOMETHING_NEW", undefined]) expect(mapAsaasStatus(s)).toBe("PENDING");
    expect(mapAsaasStatus("REFUNDED")).toBe("REFUNDED");
    expect(mapAsaasStatus("OVERDUE")).toBe("CANCELLED");
  });

  it("uses the Brasilia calendar day for the due date", () => {
    expect(brasiliaDate(new Date("2026-11-24T02:30:00Z"))).toBe("2026-11-23");
    expect(brasiliaDate(new Date("2026-11-24T15:00:00Z"), 1)).toBe("2026-11-25");
  });
});


