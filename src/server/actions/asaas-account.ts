"use server";

import { publicAppUrl } from "@/lib/app-origin";
import { revalidatePath } from "next/cache";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import { asaasAccountSchema, type AsaasAccountInput } from "@/lib/schemas/asaas-account";
import { requireMemberOf } from "@/server/auth";
import { AsaasClient, AsaasError } from "@/server/payments/asaas-client";
import { ensurePixKey } from "@/server/payments/asaas-pix-key";
import { asaasEnvironment, encryptAsaasKey } from "@/server/payments/asaas-security";
import { asaasStore, restaurantAsaasClient } from "@/server/payments/asaas-store";
import { ensureWebhook } from "@/server/payments/asaas-webhook-setup";

export type AsaasAccountResult = { ok: true; pixReady: boolean } | { ok: false; error?: string; fieldErrors?: FieldErrors };

export type ActivatePixResult = { ok: true; pixReady: boolean } | { ok: false; error: string };

/** Best effort: without it the sweeper still confirms payments, only later. */
async function registerWebhook(client: AsaasClient, email: string | undefined, restaurantId: string) {
  const state = await ensureWebhook(client, { appUrl: publicAppUrl(), token: process.env.ASAAS_WEBHOOK_TOKEN, email });
  if (state === "FAILED") console.error("[asaas] webhook not configured", { restaurant: restaurantId });
}

/** Registers the Pix key of an existing subaccount (when it failed or was still activating). OWNER only. */
export async function activateAsaasPixAction(rid: string): Promise<ActivatePixResult> {
  const member = await requireMemberOf(rid, ["OWNER"]);
  if (!member.ok) return { ok: false, error: member.error };
  try {
    const client = await restaurantAsaasClient(member.restaurantId);
    if (!client) return { ok: false, error: "Crie a conta de pagamentos primeiro." };
    const state = await ensurePixKey(client);
    await registerWebhook(client, member.user?.email, member.restaurantId);
    revalidatePath("/painel/carteira");
    if (state === "ACTIVE") return { ok: true, pixReady: true };
    if (state === "PENDING") return { ok: true, pixReady: false };
    return { ok: false, error: "O Asaas não ativou a chave Pix agora. Tente novamente em alguns minutos." };
  } catch {
    return { ok: false, error: "Não foi possível falar com o Asaas. Tente novamente mais tarde." };
  }
}

/**
 * Creates the restaurant's Asaas subaccount with the parent key and stores the one-time subaccount key
 * encrypted. OWNER only; the restaurant, environment and keys come from the server, never the browser.
 * The identity data are forwarded to Asaas and are not stored by Menzu.
 */
export async function createAsaasAccountAction(rid: string, input: AsaasAccountInput): Promise<AsaasAccountResult> {
  const member = await requireMemberOf(rid, ["OWNER"]);
  if (!member.ok) return member;
  const parsed = asaasAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const parentKey = process.env.ASAAS_API_KEY?.trim();
  if (!parentKey) return { ok: false, error: "A integração de pagamentos ainda não está configurada." };

  let environment: "sandbox" | "production";
  let store: ReturnType<typeof asaasStore>;
  try {
    environment = asaasEnvironment();
    store = asaasStore();
    // Prove the storage and the encryption key work BEFORE creating anything: Asaas shows the key once.
    encryptAsaasKey("preflight", `${member.restaurantId}:${environment}`);
    const existing = await store.from("asaas_accounts").select("restaurant_id")
      .eq("restaurant_id", member.restaurantId).eq("environment", environment).maybeSingle();
    if (existing.error) throw new Error("STORAGE");
    if (existing.data) return { ok: false, error: "Este restaurante já tem uma conta de pagamentos." };
  } catch {
    return { ok: false, error: "O armazenamento seguro não está disponível. Tente novamente mais tarde." };
  }

  const v = parsed.data;
  let created: { id: string; walletId: string; apiKey: string };
  try {
    created = await new AsaasClient(parentKey, environment).createSubaccount({
      name: v.name, email: v.email, cpfCnpj: v.cpfCnpj, mobilePhone: v.mobilePhone,
      incomeValue: v.incomeCents / 100, address: v.address, addressNumber: v.addressNumber,
      province: v.province, postalCode: v.postalCode,
      birthDate: v.cpfCnpj.length === 11 ? v.birthDate || undefined : undefined,
      companyType: v.cpfCnpj.length === 14 ? v.companyType || undefined : undefined,
    });
  } catch (error) {
    // An unknown result may have created the account: never retry blindly.
    if (error instanceof AsaasError && error.code === "UNKNOWN_RESULT") {
      console.error("[asaas] subaccount creation had an unknown result", { restaurant: member.restaurantId });
      return { ok: false, error: "Não conseguimos confirmar a criação da conta. Fale com o suporte antes de tentar de novo." };
    }
    return { ok: false, error: "O Asaas recusou os dados. Confira CPF/CNPJ, e-mail e endereço e tente de novo." };
  }

  const row = {
    restaurant_id: member.restaurantId, environment, account_id: created.id, wallet_id: created.walletId,
    encrypted_api_key: encryptAsaasKey(created.apiKey, `${member.restaurantId}:${environment}`),
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await store.from("asaas_accounts").insert(row);
    if (!error) {
      // The account is safe from here on. A missing Pix key never undoes it: the wallet page offers a retry.
      const subaccount = new AsaasClient(created.apiKey, environment);
      const pix = await ensurePixKey(subaccount).catch(() => null);
      await registerWebhook(subaccount, member.user?.email ?? v.email, member.restaurantId);
      revalidatePath("/painel/carteira");
      return { ok: true, pixReady: pix === "ACTIVE" };
    }
  }
  // The key cannot be recovered from Asaas. Log identifiers only (never the key) for manual recovery.
  console.error("[asaas] subaccount created but not stored", { restaurant: member.restaurantId, account: created.id, wallet: created.walletId });
  return { ok: false, error: "A conta foi criada, mas não conseguimos salvá-la. Fale com o suporte, sem tentar de novo." };
}
