"use client";

import { PREVIEW_ID } from "@/lib/restaurant-preview";

import { Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  Badge,
  Button,
  ConfirmationDialog,
  DataTable,
  EmptyState,
  IconButton,
  PageHeader,
  SegmentedControl,
  Switch,
  notify,
  type DataTableColumn,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { DASHBOARD_PERIODS, PERIOD_LABEL, formatMoneyShort, type DashboardPeriod } from "@/lib/dashboard";
import {
  COUPON_STATE_BADGE,
  COUPON_TYPE_LABEL,
  couponHeadline,
  couponRulesLine,
  couponState,
  couponValueLabel,
} from "@/lib/schemas/coupon";
import { deleteCouponAction, setCouponActiveAction } from "@/server/actions/coupons";
import { CouponFormModal } from "./coupon-form-modal";
import type { CouponPerformance, CouponRow } from "./types";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";

const MAX_CAMPAIGNS = 3;

type EditorState = { mode: "create" } | { mode: "edit"; coupon: CouponRow } | null;

export function CouponsView({
  coupons,
  performance,
  period,
  timeZone,
  canUseAdvanced,
}: {
  coupons: CouponRow[];
  performance: CouponPerformance;
  period: DashboardPeriod;
  timeZone: string;
  canUseAdvanced: boolean;
}) {
  const rid = useRestaurantId();
  const [editor, setEditor] = useState<EditorState>(null);
  const [toDelete, setToDelete] = useState<CouponRow | null>(null);
  // Rendered once per server render; good enough for state badges (they refresh on every revalidation).
  const [now] = useState(() => new Date());

  const campaigns = coupons
    .filter((c) => couponState(c, now) === "ACTIVE")
    .sort((a, b) => b.used_count - a.used_count)
    .slice(0, MAX_CAMPAIGNS);

  const validity = (c: CouponRow) => formatValidity(c.starts_at, c.ends_at, timeZone);

  const columns: DataTableColumn<CouponRow>[] = [
    {
      key: "code",
      header: "Código",
      sortable: true,
      cell: (c) => (
        <span className="flex flex-col">
          <span className="font-mono text-body-sm font-medium text-ink">{c.code}</span>
          {c.description && <span className="hidden text-caption text-ink-muted md:block">{c.description}</span>}
        </span>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      sortable: true,
      sortValue: (c) => COUPON_TYPE_LABEL[c.type],
      cell: (c) => <span className="text-ink-secondary">{COUPON_TYPE_LABEL[c.type]}</span>,
    },
    {
      key: "value",
      header: "Valor",
      cell: (c) => <span className="whitespace-nowrap font-extrabold">{couponValueLabel(c)}</span>,
    },
    {
      key: "validity",
      header: "Validade",
      sortable: true,
      sortValue: (c) => (c.ends_at ? new Date(c.ends_at).getTime() : null),
      cell: (c) => <span className="whitespace-nowrap text-ink-secondary">{validity(c)}</span>,
    },
    {
      key: "used_count",
      header: "Usos",
      sortable: true,
      cell: (c) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="font-bold text-ink">{c.used_count}</span>
          {c.usage_limit != null && <span className="text-ink-muted"> / {c.usage_limit}</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => {
        const badge = COUPON_STATE_BADGE[couponState(c, now)];
        return <Badge tone={badge.tone} size="sm">{badge.label}</Badge>;
      },
    },
    {
      key: "active",
      header: "Ativo",
      cell: (c) => c.id.startsWith(PREVIEW_ID) ? "—" : <CouponActiveSwitch coupon={c} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      hideLabelOnMobile: true,
      className: "md:w-24",
      cell: (c) => c.id.startsWith(PREVIEW_ID) ? null : (
        <span className="flex justify-end gap-2">
          <IconButton label={`Editar ${c.code}`} icon={Pencil} size={34} variant="outline" onClick={() => setEditor({ mode: "edit", coupon: c })} />
          <IconButton label={`Excluir ${c.code}`} icon={Trash2} size={34} variant="outline" onClick={() => setToDelete(c)} />
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5.5">
      <PageHeader
        title="Cupons"
        description="Crie campanhas de desconto e acompanhe o resultado."
        actions={
          <Button size="md" className="font-extrabold" onClick={() => setEditor({ mode: "create" })}>
            <Plus size={16} strokeWidth={2.1} aria-hidden="true" />
            Criar cupom
          </Button>
        }
      />

      {/* Reference P4: campaigns + performance in one page card. */}
      <section aria-labelledby="campaigns-title" className="flex flex-col gap-4.5 rounded-6xl border border-frame p-4.5 sm:p-6.5">
        <h2 id="campaigns-title" className="text-title-md text-ink">
          Campanhas ativas
        </h2>
        {campaigns.length > 0 ? (
          <div className="flex flex-wrap gap-3.5">
            {campaigns.map((c, i) => (
              <CampaignCard key={c.id} coupon={c} featured={i === 0} onEdit={() => setEditor({ mode: "edit", coupon: c })} />
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditor({ mode: "create" })}
            className="flex flex-col items-start gap-1 rounded-3xl border border-dashed border-line-strong p-4.5 text-left transition-[border-color] duration-150 ease-out hover:border-control"
          >
            <span className="text-item font-extrabold text-ink">Nenhuma campanha ativa</span>
            <span className="text-caption text-ink-muted">Crie um cupom para atrair novos pedidos.</span>
          </button>
        )}

        <div className="flex flex-col gap-3 border-t border-line pt-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
            <h3 className="text-body-sm font-extrabold tracking-wider text-ink-faint uppercase">Desempenho</h3>
            <CouponPeriodControl value={period} />
          </div>
          <dl className="flex flex-wrap gap-3.5">
            <PerfStat value={String(performance.orders)} label="pedidos com cupom" />
            <PerfStat value={formatMoneyShort(performance.discount_cents)} label="desconto concedido" />
            <PerfStat value={formatMoneyShort(performance.revenue_cents)} label="receita com cupom" tone="success" />
          </dl>
        </div>
      </section>

      <section aria-labelledby="all-coupons-title" className="flex flex-col gap-3.5">
        <h2 id="all-coupons-title" className="text-heading text-ink">
          Todos os cupons
        </h2>
        <DataTable
          caption="Todos os cupons"
          columns={columns}
          rows={coupons}
          getRowId={(c) => c.id}
          onRowClick={(c) => setEditor({ mode: "edit", coupon: c })}
          getRowLabel={(c) => `Editar cupom ${c.code}`}
          empty={
            <EmptyState
              icon={TicketPercent}
              title="Nenhum cupom ainda"
              description="Cupons dão desconto percentual ou em reais no checkout."
              action={
                <Button size="md" onClick={() => setEditor({ mode: "create" })}>
                  Criar cupom
                </Button>
              }
            />
          }
        />
      </section>

      <CouponFormModal
        key={editor ? (editor.mode === "edit" ? editor.coupon.id : "new") : "closed"}
        open={editor != null}
        coupon={editor?.mode === "edit" ? editor.coupon : null}
        timeZone={timeZone}
        canUseAdvanced={canUseAdvanced}
        onOpenChange={(open) => !open && setEditor(null)}
        onDelete={(c) => {
          setEditor(null);
          setToDelete(c);
        }}
      />

      <ConfirmationDialog
        open={toDelete != null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={toDelete && toDelete.used_count > 0 ? `Desativar o cupom ${toDelete.code}?` : `Excluir o cupom ${toDelete?.code ?? ""}?`}
        description={
          toDelete && toDelete.used_count > 0
            ? "Este cupom já foi usado em pedidos e não pode ser excluído. Desative-o para encerrar a campanha; o histórico de uso continua nos relatórios."
            : "Clientes não poderão mais usar este código. Esta ação não pode ser desfeita."
        }
        confirmLabel={toDelete && toDelete.used_count > 0 ? "Desativar cupom" : "Excluir cupom"}
        tone="danger"
        onConfirm={async () => {
          if (!toDelete) return;
          // A used coupon keeps its redemption history: deactivate instead of deleting.
          const used = toDelete.used_count > 0;
          const res = used ? await setCouponActiveAction(rid, toDelete.id, false) : await deleteCouponAction(rid, toDelete.id);
          if (!res.ok) {
            notify.error(res.error ?? (used ? "Não foi possível desativar o cupom." : "Não foi possível excluir o cupom."));
            throw new Error("delete failed");
          }
          notify.success(used ? `Cupom ${toDelete.code} desativado` : `Cupom ${toDelete.code} excluído`);
        }}
      />
    </div>
  );
}

function CampaignCard({ coupon, featured, onEdit }: { coupon: CouponRow; featured: boolean; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={coupon.id.startsWith(PREVIEW_ID)}
      aria-label={`Editar campanha ${coupon.code}`}
      className={cn(
        "flex min-w-0 flex-[1_1_200px] flex-col items-start gap-1.5 rounded-3xl p-4.5 text-left transition-[border-color,filter] duration-150 ease-out",
        featured ? "mz-gradient-hero text-white hover:brightness-105" : "border border-line hover:border-line-strong",
      )}
    >
      <span className={cn("font-mono text-caption font-medium", featured ? "opacity-85" : "text-ink-muted")}>{coupon.code}</span>
      <span className={cn("text-title-xl tracking-normal", featured ? "text-white" : "text-ink")}>{couponHeadline(coupon)}</span>
      <span className={cn("text-caption", featured ? "text-on-brand" : "text-ink-muted")}>{couponRulesLine(coupon)}</span>
    </button>
  );
}

function PerfStat({ value, label, tone = "ink" }: { value: string; label: string; tone?: "ink" | "success" }) {
  return (
    <div className="flex flex-[1_1_120px] flex-col-reverse">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className={cn("text-title-lg tracking-normal tabular-nums", tone === "success" ? "text-success" : "text-ink")}>{value}</dd>
    </div>
  );
}

function CouponActiveSwitch({ coupon }: { coupon: CouponRow }) {
  const rid = useRestaurantId();
  const [optimistic, setOptimistic] = useOptimistic(coupon.is_active);
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={optimistic}
      disabled={pending}
      aria-label={optimistic ? `Desativar ${coupon.code}` : `Ativar ${coupon.code}`}
      data-row-action
      onCheckedChange={(next) =>
        startTransition(safely(async () => {
          setOptimistic(next);
          const res = await setCouponActiveAction(rid, coupon.id, next);
          if (!res.ok) notify.error(res.error ?? "Não foi possível atualizar o cupom.");
          else notify.success(next ? `Cupom ${coupon.code} ativado` : `Cupom ${coupon.code} desativado`);
        }))
      }
    />
  );
}

const PERIOD_OPTIONS = DASHBOARD_PERIODS.map((value) => ({ value, label: PERIOD_LABEL[value] }));

/** Performance window kept in the URL (`?periodo=`); 30 days is the default here. */
function CouponPeriodControl({ value }: { value: DashboardPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [pending, startTransition] = useTransition();
  return (
    <SegmentedControl
      aria-label="Período do desempenho"
      options={PERIOD_OPTIONS}
      value={optimistic}
      onChange={(next) =>
        startTransition(() => {
          setOptimistic(next);
          router.replace(next === "30d" ? pathname : `${pathname}?periodo=${next}`, { scroll: false });
        })
      }
      className={cn(pending && "opacity-80")}
    />
  );
}

function formatValidity(startsAt: string | null, endsAt: string | null, timeZone: string): string {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone, day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(iso));
  if (startsAt && endsAt) return `${fmt(startsAt)} – ${fmt(endsAt)}`;
  if (endsAt) return `até ${fmt(endsAt)}`;
  if (startsAt) return `a partir de ${fmt(startsAt)}`;
  return "Sem prazo";
}
