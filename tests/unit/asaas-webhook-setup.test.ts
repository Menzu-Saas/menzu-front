import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AsaasProvider } from "@/server/payments/asaas-provider";
import { AsaasClient } from "@/server/payments/asaas-client";
import { cancelProviderCharges } from "@/server/payments/cancel";
import { asaasWebhookUrl, ensureWebhook } from "@/server/payments/asaas-webhook-setup";

const token = "t".repeat(40);
const config = { appUrl: "https://app.menzu.com.br/qualquer", token, email: "dono@example.com" };
const client = (hooks: { url: string }[] = []) => ({
  listWebhooks: vi.fn().mockResolvedValue({ data: hooks.map((h, i) => ({ id: "w" + i, enabled: true, ...h })) }),
  createWebhook: vi.fn().mockResolvedValue({ id: "w-new" }),
});

describe("webhook da subconta", () => {
  it("só aceita endereço https público", () => {
    expect(asaasWebhookUrl("https://app.menzu.com.br/x")).toBe("https://app.menzu.com.br/api/webhooks/asaas");
    for (const bad of [undefined, "", "http://app.menzu.com.br", "https://localhost:3003", "https://127.0.0.1", "https://192.168.0.10", "https://[::1]", "https://pc.local", "https://u:p@menzu.com.br"]) {
      expect(asaasWebhookUrl(bad)).toBeNull();
    }
  });

  it("cria uma vez, com o token, e não duplica", async () => {
    const c = client();
    expect(await ensureWebhook(c as never, config)).toBe("CREATED");
    expect(c.createWebhook).toHaveBeenCalledWith(expect.objectContaining({ url: "https://app.menzu.com.br/api/webhooks/asaas", authToken: token, email: "dono@example.com" }));
    const again = client([{ url: "https://app.menzu.com.br/api/webhooks/asaas" }]);
    expect(await ensureWebhook(again as never, config)).toBe("EXISTS");
    expect(again.createWebhook).not.toHaveBeenCalled();
  });

  it("não envia nada ao Asaas sem endereço público ou token válido", async () => {
    const c = client();
    expect(await ensureWebhook(c as never, { ...config, appUrl: "http://localhost:3003" })).toBe("NOT_PUBLIC");
    expect(await ensureWebhook(c as never, { ...config, token: "curto" })).toBe("NOT_PUBLIC");
    expect(c.listWebhooks).not.toHaveBeenCalled();
  });

  it("relata a falha sem lançar erro", async () => {
    const c = client();
    c.listWebhooks.mockRejectedValue(new Error("down"));
    expect(await ensureWebhook(c as never, config)).toBe("FAILED");
  });
});

describe("pedido cancelado com pagamento do Asaas", () => {
  function setup(rows: Record<string, unknown>[]) {
    const transport = vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === "DELETE" ? Response.json({ deleted: true }) : Response.json({ id: "pay_x", status: "REFUND_REQUESTED" }));
    const provider = new AsaasProvider({
      platformWalletId: "123e4567-e89b-42d3-a456-426614174000",
      loadPayment: async () => ({ restaurantId: "r-1", amountCents: 5000 }),
      clientFor: async () => new AsaasClient("sub", "sandbox", transport as unknown as typeof fetch),
    });
    const filters: [string, unknown][] = [];
    const query: Record<string, unknown> = {
      select: () => query,
      eq: (column: string, value: unknown) => { filters.push([column, value]); return query; },
      in: (column: string, value: unknown) => { filters.push([column, value]); return query; },
      not: async () => ({ data: rows, error: null }),
    };
    const refresh = vi.fn();
    const reconcile = () => ({ db: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => { refresh(); return { data: null, error: null }; } }) }) }) }) }, clientFor: async () => null, environment: "sandbox" as const });
    const calls = () => transport.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${url}`);
    return { provider, filters, query, reconcile, calls, refresh };
  }

  it("remove o Pix ainda não pago com a chave do restaurante", async () => {
    const s = setup([{ id: "pay-menzu", provider_payment_id: "pay_1", method: "PIX", status: "CANCELLED" }]);
    expect(await cancelProviderCharges({ from: () => s.query } as never, "order-1", s.provider, s.reconcile as never)).toEqual({ cancelled: 1, refunded: 0, failed: 0 });
    expect(s.filters).toEqual(expect.arrayContaining([["provider", "asaas"], ["status", ["CANCELLED", "PAID"]]]));
    expect(s.calls()).toEqual(["DELETE https://api-sandbox.asaas.com/v3/payments/pay_1"]);
  });

  it("estorna o pagamento já pago, Pix ou cartão, e confere o resultado na hora", async () => {
    const s = setup([
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", provider_payment_id: "pay_pix", method: "PIX", status: "PAID" },
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", provider_payment_id: "pay_card", method: "CARD_ONLINE", status: "PAID" },
    ]);
    expect(await cancelProviderCharges({ from: () => s.query } as never, "order-1", s.provider, s.reconcile as never)).toEqual({ cancelled: 0, refunded: 2, failed: 0 });
    expect(s.calls()).toEqual([
      "POST https://api-sandbox.asaas.com/v3/payments/pay_pix/refund",
      "POST https://api-sandbox.asaas.com/v3/payments/pay_card/refund",
    ]);
    expect(s.refresh).toHaveBeenCalledTimes(2);
  });

  it("fecha a página de cartão ainda não paga, para ninguém pagar um pedido cancelado", async () => {
    const s = setup([{ id: "pay-c", provider_payment_id: "pay_c", method: "CARD_ONLINE", status: "CANCELLED" }]);
    expect(await cancelProviderCharges({ from: () => s.query } as never, "order-1", s.provider, s.reconcile as never)).toEqual({ cancelled: 1, refunded: 0, failed: 0 });
    expect(s.calls()).toEqual(["DELETE https://api-sandbox.asaas.com/v3/payments/pay_c"]);
  });
});

