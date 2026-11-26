import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { cpfDigits, isValidCpf } from "@/lib/cpf";
import { createServiceRoleClient } from "./service-client";

/**
 * CPF do comprador. Cifrado (não é hash): o Asaas precisa do número real para criar o cliente.
 * AES-256-GCM com IV aleatório e autenticação presa ao usuário, então um valor copiado para
 * outra linha não decifra. A chave só existe no servidor; sem ela, os CPFs salvos são ilegíveis.
 */
function encryptionKey(): Buffer {
  const value = process.env.MENZU_CPF_ENCRYPTION_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("CPF_ENCRYPTION_KEY_NOT_CONFIGURED");
  return Buffer.from(value, "hex");
}

function seal(cpf: string, context: string): string {
  const digits = cpfDigits(cpf);
  if (!isValidCpf(digits)) throw new Error("INVALID_CPF");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(digits, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".");
}

function open(encrypted: string, context: string): string {
  const [version, iv, tag, data, extra] = encrypted.split(".");
  if (version !== "v1" || !iv || !tag || !data || extra !== undefined) throw new Error("INVALID_ENCRYPTED_CPF");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

/** CPF guardado na conta do comprador. O contexto prende o valor ao usuário. */
export const encryptCpf = (cpf: string, userId: string) => seal(cpf, `buyer-cpf:${userId}`);
export const decryptCpf = (encrypted: string, userId: string) => open(encrypted, `buyer-cpf:${userId}`);

/**
 * CPF a caminho da cobrança. O pedido passa por uma fila gravada em disco, então o CPF só viaja
 * cifrado, preso à chave de idempotência do pedido: outro pedido não consegue abri-lo.
 */
export const sealCpfForOrder = (cpf: string, orderKey: string) => seal(cpf, `order-cpf:${orderKey}`);
export const openCpfForOrder = (sealed: string, orderKey: string) => open(sealed, `order-cpf:${orderKey}`);

function vault(): SupabaseClient {
  const client = createServiceRoleClient();
  if (!client) throw new Error("CPF_STORAGE_NOT_CONFIGURED");
  return client as unknown as SupabaseClient;
}

/** Chame só depois de identificar o usuário no servidor (nunca com um id vindo do navegador). */
export async function saveBuyerCpf(userId: string, cpf: string): Promise<void> {
  z.uuid().parse(userId);
  const digits = cpfDigits(cpf);
  const { error } = await vault().from("buyer_documents").upsert({
    user_id: userId,
    encrypted_cpf: encryptCpf(digits, userId),
    cpf_last3: digits.slice(-3),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw new Error("CPF_STORAGE_UNAVAILABLE");
}

/** Só para uso do servidor ao emitir a cobrança. Nunca devolva o valor ao navegador. */
export async function getBuyerCpf(userId: string): Promise<string | null> {
  z.uuid().parse(userId);
  const { data, error } = await vault().from("buyer_documents").select("encrypted_cpf").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("CPF_STORAGE_UNAVAILABLE");
  return data ? decryptCpf(z.string().parse(data.encrypted_cpf), userId) : null;
}

/** Os 3 últimos dígitos, para mostrar "CPF já cadastrado" no checkout. */
export async function getBuyerCpfLast3(userId: string): Promise<string | null> {
  z.uuid().parse(userId);
  const { data, error } = await vault().from("buyer_documents").select("cpf_last3").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("CPF_STORAGE_UNAVAILABLE");
  return data ? z.string().regex(/^\d{3}$/).parse(data.cpf_last3) : null;
}
