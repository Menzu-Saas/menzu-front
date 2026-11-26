import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/payments/asaas-store", () => ({ asaasStore: vi.fn(), restaurantAsaasClient: vi.fn() }));

import { AsaasError } from "@/server/payments/asaas-client";
import { reconcileAsaasInbox } from "@/server/payments/asaas-reconciler";
import { subscriptionPaymentStatus, sweepAsaasSubscriptions } from "@/server/payments/asaas-subscription";

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

describe("status da mensalidade", () => {
  it("só conta como pago quando o Asaas recebeu", () => {
    expect(subscriptionPaymentStatus("RECEIVED")).toBe("approved");
    expect(subscriptionPaymentStatus("CONFIRMED")).toBe("approved");
    expect(subscriptionPaymentStatus("OVERDUE")).toBe("rejected");
    expect(subscriptionPaymentStatus("REFUNDED")).toBe("refunded");
    for (const s of ["PENDING", "AWAITING_RISK_ANALYSIS", "NOVO_STATUS"]) expect(subscriptionPaymentStatus(s)).toBe("pending");
  });
});

/** Inbox event for a charge of the Menzu account (no restaurant owns it). */
function inboxDb(rpcResult = "approved") {
  const rpc = vi.fn().mockResolvedValue({ data: rpcResult, error: null });
  const updates: unknown[] = [];
  const from = (table: string) => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "is", "like", "order", "limit"]) q[m] = () => q;
    q.maybeSingle = async () => ({ data: null, error: null }); // not a restaurant charge
    q.then = (resolve: (v: unknown) => void) => resolve({ data: table === "asaas_webhook_inbox" ? [{ event_id: "evt-9", event_type: "PAYMENT_RECEIVED", account_id: "conta-menzu", resource_id: "pay_sub" }] : [], error: null });
    q.update = (patch: unknown) => { updates.push(patch); return { eq: () => ({ eq: async () => ({ error: null }) }) }; };
    return q;
  };
  return { db: { from, rpc } as never, rpc, updates };
}

describe("evento de mensalidade no webhook", () => {
  it("lê a cobrança com a chave do Menzu e aplica na assinatura", async () => {
    const { db, rpc, updates } = inboxDb();
    const menzuClient = { getPayment: vi.fn().mockResolvedValue({ id: "pay_sub", status: "RECEIVED", value: 99, subscription: "sub_1", externalReference: null }) };
    const summary = await reconcileAsaasInbox({ db, clientFor: async () => null, environment: "sandbox", menzuClient: menzuClient as never });
    expect(menzuClient.getPayment).toHaveBeenCalledWith("pay_sub");
    expect(rpc).toHaveBeenCalledWith("apply_asaas_subscription_payment", expect.objectContaining({
      p_provider_subscription_id: "sub_1", p_provider_payment_id: "pay_sub", p_status: "approved", p_amount_cents: 9900, p_event_id: "sandbox:evt-9",
    }));
    expect(summary.applied).toBe(1);
    expect(updates).toHaveLength(1);
  });

  it("ignora cobrança que não é de assinatura nem do Menzu", async () => {
    const { db, rpc } = inboxDb();
    const menzuClient = { getPayment: vi.fn().mockRejectedValue(new AsaasError("REQUEST_FAILED", 404)) };
    const summary = await reconcileAsaasInbox({ db, clientFor: async () => null, environment: "sandbox", menzuClient: menzuClient as never });
    expect(rpc).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  it("guarda o evento para nova tentativa quando o Asaas falha", async () => {
    const { db, rpc, updates } = inboxDb();
    const menzuClient = { getPayment: vi.fn().mockRejectedValue(new AsaasError("REQUEST_FAILED", 503)) };
    const summary = await reconcileAsaasInbox({ db, clientFor: async () => null, environment: "sandbox", menzuClient: menzuClient as never });
    expect(summary.failed).toBe(1);
    expect(rpc).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });
});

describe("varredor das mensalidades", () => {
  it("aplica as cobranças das assinaturas, inclusive a que aguarda o primeiro pagamento", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "approved", error: null });
    const db = { rpc, from: () => ({ select: () => ({ or: () => ({ limit: async () => ({ data: [{ provider: "manual", provider_subscription_id: null, pending_provider_subscription_id: "sub_new" }], error: null }) }) }) }) };
    const client = { listSubscriptionPayments: vi.fn().mockResolvedValue({ data: [{ id: "pay_1", status: "CONFIRMED", value: 49 }] }) };
    expect(await sweepAsaasSubscriptions(db as never, client as never)).toEqual({ applied: 1, failed: 0 });
    expect(client.listSubscriptionPayments).toHaveBeenCalledWith("sub_new");
    expect(rpc).toHaveBeenCalledWith("apply_asaas_subscription_payment", expect.objectContaining({ p_provider_subscription_id: "sub_new", p_status: "approved", p_amount_cents: 4900 }));
  });

  it("não faz nada sem a chave do Menzu", async () => {
    expect(await sweepAsaasSubscriptions({} as never, null)).toEqual({ applied: 0, failed: 0 });
  });
});
