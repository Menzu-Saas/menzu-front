import { beforeEach, describe, expect, it, vi } from "vitest";

const rid = "11111111-1111-4111-8111-111111111111";
const m = vi.hoisted(() => ({
  requireMemberOf: vi.fn(),
  createSubaccount: vi.fn(),
  listPixKeys: vi.fn(),
  createRandomPixKey: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth", () => ({ requireMemberOf: m.requireMemberOf }));
vi.mock("@/server/payments/asaas-store", () => ({
  asaasStore: () => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: m.maybeSingle }) }) }), insert: m.insert }) }),
}));
vi.mock("@/server/payments/asaas-client", async (original) => {
  const actual = await original<typeof import("@/server/payments/asaas-client")>();
  return { ...actual, AsaasClient: class { createSubaccount = m.createSubaccount; listPixKeys = m.listPixKeys; createRandomPixKey = m.createRandomPixKey; } };
});

import { createAsaasAccountAction } from "@/server/actions/asaas-account";
import { AsaasError } from "@/server/payments/asaas-client";

const company = { name: "Burger House LTDA", email: "dono@example.com", cpfCnpj: "11.222.333/0001-81", mobilePhone: "(81) 99999-9999", incomeCents: 5_000_000, postalCode: "50000-000", address: "Rua A", addressNumber: "10", province: "Centro", companyType: "LIMITED" as const };

beforeEach(() => {
  vi.stubEnv("ASAAS_API_KEY", "parent-key");
  vi.stubEnv("ASAAS_ENVIRONMENT", "sandbox");
  vi.stubEnv("ASAAS_ENCRYPTION_KEY", "a".repeat(64));
  m.requireMemberOf.mockReset().mockResolvedValue({ ok: true, restaurantId: rid });
  m.maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
  m.insert.mockReset().mockResolvedValue({ error: null });
  m.createSubaccount.mockReset().mockResolvedValue({ id: "acc-1", walletId: "123e4567-e89b-42d3-a456-426614174000", apiKey: "sub-secret-key" });
  m.listPixKeys.mockReset().mockResolvedValue({ data: [{ id: "k1", status: "ACTIVE" }] });
  m.createRandomPixKey.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createAsaasAccountAction", () => {
  it("creates the subaccount and stores only the encrypted key", async () => {
    expect(await createAsaasAccountAction(rid, company)).toEqual({ ok: true, pixReady: true });
    expect(m.createSubaccount).toHaveBeenCalledWith(expect.objectContaining({ cpfCnpj: "11222333000181", mobilePhone: "81999999999", incomeValue: 50000, postalCode: "50000000", companyType: "LIMITED" }));
    const row = m.insert.mock.calls[0][0];
    expect(row).toMatchObject({ restaurant_id: rid, environment: "sandbox", account_id: "acc-1" });
    expect(row.encrypted_api_key).toMatch(/^v1\./);
    expect(JSON.stringify(row)).not.toContain("sub-secret-key");
  });

  it("keeps the account when the Pix key cannot be set up and says so", async () => {
    m.listPixKeys.mockRejectedValue(new Error("down"));
    expect(await createAsaasAccountAction(rid, company)).toEqual({ ok: true, pixReady: false });
    expect(m.insert).toHaveBeenCalledTimes(1);
    expect(m.createRandomPixKey).not.toHaveBeenCalled();
  });

  it("refuses non-owners without calling Asaas", async () => {
    m.requireMemberOf.mockResolvedValue({ ok: false, error: "Sem permissão." });
    expect(await createAsaasAccountAction(rid, company)).toMatchObject({ ok: false });
    expect(m.requireMemberOf).toHaveBeenCalledWith(rid, ["OWNER"]);
    expect(m.createSubaccount).not.toHaveBeenCalled();
  });

  it("validates identity data before any request", async () => {
    const res = await createAsaasAccountAction(rid, { ...company, cpfCnpj: "12345678901" });
    expect(res).toMatchObject({ ok: false, fieldErrors: { cpfCnpj: expect.any(String) } });
    expect(await createAsaasAccountAction(rid, { ...company, companyType: "" })).toMatchObject({ ok: false, fieldErrors: { companyType: expect.any(String) } });
    expect(m.createSubaccount).not.toHaveBeenCalled();
  });

  it("does not create a second account for the same restaurant", async () => {
    m.maybeSingle.mockResolvedValue({ data: { restaurant_id: rid }, error: null });
    expect(await createAsaasAccountAction(rid, company)).toMatchObject({ ok: false, error: expect.stringContaining("já tem") });
    expect(m.createSubaccount).not.toHaveBeenCalled();
  });

  it("does not create anything when the encryption key is missing", async () => {
    vi.stubEnv("ASAAS_ENCRYPTION_KEY", "");
    expect(await createAsaasAccountAction(rid, company)).toMatchObject({ ok: false });
    expect(m.createSubaccount).not.toHaveBeenCalled();
  });

  it("never retries an unknown creation result", async () => {
    m.createSubaccount.mockRejectedValue(new AsaasError("UNKNOWN_RESULT"));
    expect(await createAsaasAccountAction(rid, company)).toMatchObject({ ok: false, error: expect.stringContaining("suporte") });
    expect(m.createSubaccount).toHaveBeenCalledTimes(1);
    expect(m.insert).not.toHaveBeenCalled();
  });

  it("reports a stored-key failure without logging the key", async () => {
    m.insert.mockResolvedValue({ error: { message: "db down" } });
    const log = vi.spyOn(console, "error");
    expect(await createAsaasAccountAction(rid, company)).toMatchObject({ ok: false, error: expect.stringContaining("suporte") });
    expect(m.insert).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(log.mock.calls)).not.toContain("sub-secret-key");
  });
});
