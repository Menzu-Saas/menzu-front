import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/payments/asaas-store", () => ({ asaasStore: vi.fn(), restaurantAsaasClient: vi.fn() }));

import { reconcileAsaasInbox, sweepPendingAsaasPayments } from "@/server/payments/asaas-reconciler";

const restaurant = "11111111-1111-4111-8111-111111111111";
const payment = "22222222-2222-4222-8222-222222222222";

type Fixture = { inbox: Record<string, unknown>[]; local: Record<string, unknown> | null; owner: Record<string, unknown> | null };

function makeDb(f: Fixture) {
  const updates: unknown[] = [];
  const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
  const from = (table: string) => {
    const q: Record<string, unknown> = {};
    const chain = () => q;
    for (const m of ["select", "eq", "is", "like", "order", "limit", "in", "gte"]) q[m] = chain;
    q.maybeSingle = async () => ({ data: table === "payments" ? f.local ?? f.owner : f.owner, error: null });
    q.then = (resolve: (v: unknown) => void) => resolve({ data: f.inbox, error: null });
    q.update = (patch: unknown) => { updates.push(patch); return { eq: () => ({ eq: async () => ({ error: null }) }) }; };
    return q;
  };
  return { db: { from, rpc } as never, rpc, updates };
}

const event = { event_id: "evt-1", event_type: "PAYMENT_RECEIVED", account_id: "acc-1", resource_id: "pay_1" };
const fixture = (): Fixture => ({ inbox: [event], owner: { restaurant_id: restaurant }, local: { restaurant_id: restaurant, amount_cents: 5000, provider: "asaas" } });
const clientWith = (remote: Record<string, unknown>) => ({ getPayment: vi.fn().mockResolvedValue({ id: "pay_1", externalReference: payment, ...remote }) });

describe("sweepPendingAsaasPayments", () => {
  const open = { id: payment, restaurant_id: restaurant, provider_payment_id: "pay_1", amount_cents: 5000, status: "PENDING" };
  const sweepDb = (rows: Record<string, unknown>[]) => makeDb({ inbox: rows, owner: null, local: null });

  it("confirms a charge whose webhook never arrived", async () => {
    const { db, rpc } = sweepDb([open]);
    const client = clientWith({ status: "CONFIRMED", value: 50, netValue: 49.01 });
    const summary = await sweepPendingAsaasPayments({ db, clientFor: async () => client as never, environment: "sandbox" });
    expect(summary.applied).toBe(1);
    expect(rpc).toHaveBeenCalledWith("apply_asaas_payment_update", expect.objectContaining({
      p_payment_id: payment, p_status: "PAID", p_event_id: "sandbox:sweep:pay_1:CONFIRMED", p_gateway_fee_cents: 99,
    }));
  });

  it("does nothing when Asaas still reports the same status", async () => {
    const { db, rpc } = sweepDb([open]);
    const summary = await sweepPendingAsaasPayments({ db, clientFor: async () => clientWith({ status: "PENDING", value: 50, netValue: 49 }) as never, environment: "sandbox" });
    expect(summary.skipped).toBe(1);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("ignores a charge that is not this payment or has another amount", async () => {
    const { db, rpc } = sweepDb([open, { ...open, id: "33333333-3333-4333-8333-333333333333" }]);
    const client = { getPayment: vi.fn().mockResolvedValue({ id: "pay_1", externalReference: payment, status: "RECEIVED", value: 49, netValue: 48 }) };
    const summary = await sweepPendingAsaasPayments({ db, clientFor: async () => client as never, environment: "sandbox" });
    expect(summary.skipped).toBe(2);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps going when Asaas fails for one charge", async () => {
    const { db } = sweepDb([open]);
    const client = { getPayment: vi.fn().mockRejectedValue(new Error("down")) };
    expect((await sweepPendingAsaasPayments({ db, clientFor: async () => client as never, environment: "sandbox" })).failed).toBe(1);
  });
});

describe("reconcileAsaasInbox", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

  it("fetches the charge from Asaas and applies PAID with fees from the net amount", async () => {
    const { db, rpc, updates } = makeDb(fixture());
    const client = clientWith({ status: "RECEIVED", value: 50, netValue: 49.01 });
    const summary = await reconcileAsaasInbox({ db, clientFor: async () => client as never, environment: "sandbox" });
    expect(summary).toMatchObject({ applied: 1, failed: 0 });
    expect(client.getPayment).toHaveBeenCalledWith("pay_1");
    expect(rpc).toHaveBeenCalledWith("apply_asaas_payment_update", expect.objectContaining({
      p_payment_id: payment, p_status: "PAID", p_event_id: "sandbox:evt-1",
      p_gateway_fee_cents: 99,                         // 5000 - 4901
      p_platform_fee_cents: Math.floor((4901 * 350) / 10000), // 3.5% of the net amount
    }));
    expect(updates).toHaveLength(1); // inbox row marked processed
  });

  it("ignores a charge whose amount or restaurant does not match the Menzu payment", async () => {
    const f = fixture();
    f.local = { restaurant_id: restaurant, amount_cents: 9999, provider: "asaas" };
    const { db, rpc } = makeDb(f);
    const summary = await reconcileAsaasInbox({ db, clientFor: async () => clientWith({ status: "RECEIVED", value: 50, netValue: 49 }) as never, environment: "sandbox" });
    expect(summary.skipped).toBe(1);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps the event for retry when Asaas is unreachable", async () => {
    const { db, rpc, updates } = makeDb(fixture());
    const client = { getPayment: vi.fn().mockRejectedValue(new Error("down")) };
    const summary = await reconcileAsaasInbox({ db, clientFor: async () => client as never, environment: "sandbox" });
    expect(summary.failed).toBe(1);
    expect(rpc).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it("does not mark anything paid for a pending charge and sends no fees", async () => {
    const { db, rpc } = makeDb(fixture());
    await reconcileAsaasInbox({ db, clientFor: async () => clientWith({ status: "PENDING", value: 50, netValue: 49 }) as never, environment: "sandbox" });
    expect(rpc).toHaveBeenCalledWith("apply_asaas_payment_update", expect.objectContaining({ p_status: "PENDING", p_gateway_fee_cents: null, p_platform_fee_cents: null }));
  });
});

