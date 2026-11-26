import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

function encryptionKey() {
  const value = process.env.ASAAS_ENCRYPTION_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("ASAAS_ENCRYPTION_KEY_NOT_CONFIGURED");
  return Buffer.from(value, "hex");
}

export function encryptAsaasKey(secret: string, tenantContext: string): string {
  if (!secret.trim()) throw new Error("EMPTY_ASAAS_KEY");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(tenantContext));
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptAsaasKey(encrypted: string, tenantContext: string): string {
  const [version, iv, tag, data, extra] = encrypted.split(".");
  if (version !== "v1" || !iv || !tag || !data || extra !== undefined) throw new Error("INVALID_ENCRYPTED_KEY");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAAD(Buffer.from(tenantContext));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

export function validAsaasWebhookToken(received: string | null): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
  if (expected.length < 32 || expected.length > 255 || /\s/.test(expected) || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function asaasEnvironment(): "sandbox" | "production" {
  const value = process.env.ASAAS_ENVIRONMENT ?? "sandbox";
  if (value !== "sandbox" && value !== "production") throw new Error("INVALID_ASAAS_ENVIRONMENT");
  return value;
}
