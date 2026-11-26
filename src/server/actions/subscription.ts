"use server";

import { publicAppUrl } from "@/lib/app-origin";
import { revalidatePath } from "next/cache";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import { subscribeSchema, type SubscribeInput } from "@/lib/schemas/subscription";
import { requireMemberOf } from "@/server/auth";
import { AsaasError } from "@/server/payments/asaas-client";
import { brasiliaDate } from "@/server/payments/asaas-provider";
import { menzuAsaasClient, openInvoiceUrl } from "@/server/payments/asaas-subscription";
import { asaasStore } from "@/server/payments/asaas-store";
import { ensureWebhook } from "@/server/payments/asaas-webhook-setup";

export type SubscribeResult = { ok: true; invoiceUrl: string | null } | { ok: false; error?: string; fieldErrors?: FieldErrors };

/**
 * Subscribes the restaurant to a paid plan, billed monthly by the Menzu Asaas account. OWNER only. The plan
 * takes effect when Asaas confirms the first payment. The billing document is sent to Asaas, not stored.
 */
export async function subscribePlanAction(rid: string, input: SubscribeInput): Promise<SubscribeResult> {
  const member = await requireMemberOf(rid, ["OWNER"]);
  if (!member.ok) return member;
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const client = menzuAsaasClient();
  if (!client) return { ok: false, error: "A cobrança de planos ainda não está configurada." };

  const db = asaasStore();
  const [planRes, subRes] = await Promise.all([
    db.from("plans").select("id,name,price_monthly_cents").eq("slug", parsed.data.planSlug).eq("is_active", true).eq("is_public", true).maybeSingle(),
    db.from("restaurant_subscriptions").select("plan_id,provider,status,pending_plan_id,pending_provider_subscription_id").eq("restaurant_id", member.restaurantId).maybeSingle(),
  ]);
  if (planRes.error || subRes.error) return { ok: false, error: "Não foi possível consultar os planos agora." };
  const plan = planRes.data;
  if (!plan || plan.price_monthly_cents <= 0) return { ok: false, error: "Plano indisponível." };
  const current = subRes.data;
  // Never create a second subscription while one is waiting for its first payment: send to its invoice.
  if (current?.pending_provider_subscription_id) {
    if (current.pending_plan_id === plan.id) {
      return { ok: true, invoiceUrl: await openInvoiceUrl(client, current.pending_provider_subscription_id).catch(() => null) };
    }
    return { ok: false, error: "Já existe uma assinatura aguardando o primeiro pagamento. Pague-a ou fale com o suporte para trocar de plano." };
  }
  if (current?.provider === "asaas" && current.plan_id === plan.id && current.status === "active") {
    return { ok: false, error: "Este já é o seu plano atual." };
  }

  let subscriptionId: string;
  try {
    const customer = await client.createCustomer({
      name: parsed.data.name, cpfCnpj: parsed.data.cpfCnpj, email: parsed.data.email,
      externalReference: `restaurant:${member.restaurantId}`,
    });
    const created = await client.createSubscription({
      customer: customer.id, amountCents: plan.price_monthly_cents, nextDueDate: brasiliaDate(new Date()),
      description: `Menzu · plano ${plan.name}`, externalReference: `plan:${member.restaurantId}`,
    });
    subscriptionId = created.id;
  } catch (error) {
    if (error instanceof AsaasError && error.code === "UNKNOWN_RESULT") {
      console.error("[subscription] creation had an unknown result", { restaurant: member.restaurantId });
      return { ok: false, error: "Não conseguimos confirmar a assinatura. Aguarde alguns minutos antes de tentar de novo." };
    }
    return { ok: false, error: "O Asaas recusou os dados. Confira o CPF/CNPJ e o e-mail." };
  }

  const { error } = await db.rpc("begin_asaas_subscription", { p_restaurant_id: member.restaurantId, p_plan_id: plan.id, p_provider_subscription_id: subscriptionId });
  if (error) {
    console.error("[subscription] created at Asaas but not recorded", { restaurant: member.restaurantId, subscription: subscriptionId });
    return { ok: false, error: "A assinatura foi criada, mas não conseguimos registrá-la. Fale com o suporte antes de tentar de novo." };
  }
  // The Menzu account must notify payments too (best effort; the sweeper covers it).
  await ensureWebhook(client, { appUrl: publicAppUrl(), token: process.env.ASAAS_WEBHOOK_TOKEN, email: parsed.data.email }).catch(() => null);
  revalidatePath("/painel/plano");
  return { ok: true, invoiceUrl: await openInvoiceUrl(client, subscriptionId).catch(() => null) };
}
