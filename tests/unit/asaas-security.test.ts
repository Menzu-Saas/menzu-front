import { afterEach, expect, it, vi } from "vitest";
import { decryptAsaasKey, encryptAsaasKey, validAsaasWebhookToken, asaasEnvironment } from "@/server/payments/asaas-security";
vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

it("binds encrypted credentials to restaurant and environment and detects tampering", () => {
  vi.stubEnv("ASAAS_ENCRYPTION_KEY", "ab".repeat(32));
  const encrypted = encryptAsaasKey("subaccount-secret", "restaurant-a:sandbox");
  expect(encrypted).not.toContain("subaccount-secret");
  expect(decryptAsaasKey(encrypted, "restaurant-a:sandbox")).toBe("subaccount-secret");
  expect(() => decryptAsaasKey(encrypted, "restaurant-b:sandbox")).toThrow();
  expect(() => decryptAsaasKey(encrypted, "restaurant-a:production")).toThrow();
  expect(encryptAsaasKey("subaccount-secret", "restaurant-a:sandbox")).not.toBe(encrypted);
  vi.stubEnv("ASAAS_ENCRYPTION_KEY", "cd".repeat(32));
  expect(() => decryptAsaasKey(encrypted, "restaurant-a:sandbox")).toThrow();
});

it("rejects unconfigured or incorrect webhook tokens", () => {
  vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "");
  expect(validAsaasWebhookToken("")).toBe(false);
  vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "abc123".repeat(8));
  expect(validAsaasWebhookToken("abc123".repeat(8))).toBe(true);
  expect(validAsaasWebhookToken("abc124".repeat(8))).toBe(false);
  expect(validAsaasWebhookToken(null)).toBe(false);
});

it("defaults to sandbox and fails closed on invalid configuration", () => {
  vi.stubEnv("ASAAS_ENVIRONMENT", undefined);
  expect(asaasEnvironment()).toBe("sandbox");
  vi.stubEnv("ASAAS_ENVIRONMENT", "typo");
  expect(() => asaasEnvironment()).toThrow();
});
