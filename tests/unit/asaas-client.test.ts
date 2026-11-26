import { expect, it, vi } from "vitest";
import { AsaasClient } from "@/server/payments/asaas-client";
vi.mock("server-only", () => ({}));
const wallet = "123e4567-e89b-42d3-a456-426614174000";

it("uses sandbox, server headers and converts balance to cents", async () => {
  const transport = vi.fn().mockResolvedValue(Response.json({ balance: 12.34 }));
  expect(await new AsaasClient("secret", "sandbox", transport).getBalanceCents()).toBe(1234);
  expect(transport).toHaveBeenCalledWith("https://api-sandbox.asaas.com/v3/finance/balance", expect.objectContaining({ method: "GET", headers: expect.objectContaining({ access_token: "secret" }), cache: "no-store", redirect: "error" }));
});

it("creates the platform split without transferring the restaurant remainder", async () => {
  const transport = vi.fn().mockResolvedValue(Response.json({ id: "pay_1", status: "PENDING" }));
  await new AsaasClient("subaccount-key", "sandbox", transport).createPixCharge({ customer: "cus_123", amountCents: 7890, dueDate: "2026-11-21", externalReference: "order-1", platformWalletId: wallet, platformPercent: 5 });
  expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual({ customer: "cus_123", billingType: "PIX", value: 78.9, dueDate: "2026-11-21", externalReference: "order-1", split: [{ walletId: wallet, percentualValue: 5 }] });
});

it("rejects invalid money, percentages and Pix keys before any request", async () => {
  const transport = vi.fn();
  const client = new AsaasClient("secret", "sandbox", transport);
  expect(() => client.requestPixWithdrawal({ amountCents: -1, externalReference: "x", pixAddressKey: "x", pixAddressKeyType: "EMAIL" })).toThrow();
  expect(() => client.createPixCharge({ customer: "cus_1", amountCents: 1.5, dueDate: "2026-11-21", externalReference: "x", platformWalletId: wallet, platformPercent: 101 })).toThrow();
  expect(transport).not.toHaveBeenCalled();
});

it("never retries a withdrawal with unknown result and never leaks gateway errors", async () => {
  const transport = vi.fn().mockRejectedValue(new Error("secret-token"));
  await expect(new AsaasClient("secret", "sandbox", transport).requestPixWithdrawal({ amountCents: 100, externalReference: "withdraw-1", pixAddressKey: "owner@example.com", pixAddressKeyType: "EMAIL" })).rejects.toThrow("UNKNOWN_RESULT");
  expect(transport).toHaveBeenCalledTimes(1);
});

it("preserves pending withdrawal status instead of claiming settlement", async () => {
  const transport = vi.fn().mockResolvedValue(Response.json({ id: "transfer-1", status: "PENDING" }));
  const result = await new AsaasClient("secret", "sandbox", transport).requestPixWithdrawal({ amountCents: 1234, externalReference: "withdraw-1", pixAddressKey: "owner@example.com", pixAddressKeyType: "EMAIL" });
  expect(result.status).toBe("PENDING");
  expect(JSON.parse(transport.mock.calls[0][1].body).value).toBe(12.34);
});

it("validates subaccount identity requirements and captures its one-time credentials", async () => {
  const transport = vi.fn().mockResolvedValue(Response.json({ id: "account-1", walletId: wallet, apiKey: "one-time-key" }));
  const client = new AsaasClient("parent-key", "sandbox", transport);
  const input = { name: "Restaurante", email: "owner@example.com", cpfCnpj: "12345678901", mobilePhone: "81999999999", incomeValue: 1000, address: "Rua A", addressNumber: "1", province: "Centro", postalCode: "50000000" };
  expect(() => client.createSubaccount(input)).toThrow();
  expect(await client.createSubaccount({ ...input, birthDate: "1990-01-01" })).toEqual({ id: "account-1", walletId: wallet, apiKey: "one-time-key" });
  expect(transport).toHaveBeenCalledTimes(1);
});
