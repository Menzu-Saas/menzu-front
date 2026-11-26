import { PageHeader } from "@/components/ui";
import { SubscribeForm } from "@/components/plan/subscribe-form";
import { formatMoney } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { menzuAsaasClient, openInvoiceUrl } from "@/server/payments/asaas-subscription";

export const metadata = { title: "Plano" };
export const dynamic = "force-dynamic";

type Entitlements = {
  effective_status?: string;
  plan?: { slug: string; name: string } | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  pending_plan_id?: string | null;
};

const date = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : null;

function statusLine(e: Entitlements): string {
  switch (e.effective_status) {
    case "trialing": return `Período de teste${date(e.trial_ends_at) ? " até " + date(e.trial_ends_at) : ""}.`;
    case "active": return date(e.current_period_end) ? `Ativo, renovação em ${date(e.current_period_end)}.` : "Ativo.";
    case "past_due": return "Pagamento pendente. Os recursos continuam liberados durante a carência.";
    case "suspended": return "Suspenso por falta de pagamento. Assine um plano para reativar.";
    case "cancelled": return "Cancelado. Os recursos seguem até o fim do período pago.";
    case "expired": return "Expirado.";
    default: return "Sem plano.";
  }
}

/** Monthly plan (mensalidade): current state, available plans and payment link. OWNER only. */
export default async function PlanPage() {
  const { restaurantId } = await requireMember(["OWNER"]);
  const supabase = await createSupabaseServerClient();
  const [ent, plans, features, sub] = await Promise.all([
    supabase.rpc("restaurant_entitlements", { p_restaurant_id: restaurantId }),
    supabase.from("plans").select("id,slug,name,description,price_monthly_cents,sort_order").eq("is_active", true).eq("is_public", true).order("sort_order"),
    supabase.from("plan_features").select("plan_id,feature_key,enabled,limit_value,features(name,kind)").eq("enabled", true),
    supabase.from("restaurant_subscriptions").select("pending_plan_id,pending_provider_subscription_id").eq("restaurant_id", restaurantId).maybeSingle(),
  ]);
  const e = (ent.data ?? {}) as Entitlements;
  const pendingPlan = plans.data?.find((p) => p.id === sub.data?.pending_plan_id);
  const client = menzuAsaasClient();
  const pendingInvoice = client && sub.data?.pending_provider_subscription_id
    ? await openInvoiceUrl(client, sub.data.pending_provider_subscription_id).catch(() => null) : null;

  const featuresOf = (planId: string) => (features.data ?? [])
    .filter((f) => f.plan_id === planId)
    .map((f) => {
      const meta = Array.isArray(f.features) ? f.features[0] : f.features;
      const name = (meta as { name?: string } | null)?.name ?? f.feature_key;
      return (meta as { kind?: string } | null)?.kind === "limit" ? `${name}: ${f.limit_value ?? "ilimitado"}` : name;
    });

  return <div className="flex flex-col gap-5.5">
    <PageHeader title="Plano" description="Mensalidade do Menzu e recursos liberados" />
    <section className="rounded-2xl border border-line bg-surface p-6">
      <p className="text-body-sm text-ink-muted">Plano atual</p>
      <p className="my-2 text-2xl font-extrabold">{e.plan?.name ?? "—"}</p>
      <p role="status" className="text-body-sm text-ink-muted">{statusLine(e)}</p>
      {pendingPlan && <div className="mt-4 rounded-xl border border-brand-soft-border bg-brand-soft p-4">
        <p className="font-bold">Aguardando o pagamento do plano {pendingPlan.name}.</p>
        <p className="text-body-sm text-ink-secondary">O plano é liberado assim que o pagamento for confirmado.</p>
        {pendingInvoice && <a href={pendingInvoice} rel="noreferrer noopener" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brand px-4 font-bold text-white">Pagar {formatMoney(pendingPlan.price_monthly_cents)} no Asaas</a>}
      </div>}
    </section>
    <section className="grid gap-4 lg:grid-cols-3" aria-label="Planos disponíveis">
      {(plans.data ?? []).map((plan) => {
        const current = e.plan?.slug === plan.slug && (e.effective_status === "active" || e.effective_status === "past_due");
        const price = formatMoney(plan.price_monthly_cents);
        return <article key={plan.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-subheading">{plan.name}</h2>
          <p><span className="text-2xl font-extrabold">{price}</span><span className="text-body-sm text-ink-muted"> /mês</span></p>
          {plan.description && <p className="text-body-sm text-ink-muted">{plan.description}</p>}
          <ul className="list-disc space-y-1 pl-5 text-body-sm text-ink-secondary">{featuresOf(plan.id).map((name) => <li key={name}>{name}</li>)}</ul>
          {current ? <p className="mt-auto rounded-xl bg-surface-muted p-3 text-center font-bold">Plano atual</p>
            : pendingPlan ? null
            : <details className="mt-auto"><summary className="cursor-pointer font-bold text-brand">Assinar o {plan.name}</summary>
                <div className="mt-3"><SubscribeForm planSlug={String(plan.slug)} planName={plan.name} priceLabel={price} /></div>
              </details>}
        </article>;
      })}
    </section>
    <p className="text-caption text-ink-muted">A mensalidade é cobrada todo mês pelo Asaas. Você paga por Pix, boleto ou cartão na página segura do Asaas.</p>
  </div>;
}
