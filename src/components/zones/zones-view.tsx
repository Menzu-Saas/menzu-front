"use client";

import { Info, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";
import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { Badge, Button, ConfirmationDialog, EmptyState, IconButton, PageHeader, Switch, notify } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { deleteZoneAction, setZoneActiveAction } from "@/server/actions/zones";
import { ZoneFormModal } from "./zone-form-modal";
import { ZONE_TYPE_BADGE, type ZoneRow } from "./types";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";

const MAX_CHIPS = 6;

type EditorState = { mode: "create" } | { mode: "edit"; zone: ZoneRow } | null;

export function ZonesView({ zones }: { zones: ZoneRow[] }) {
  const rid = useRestaurantId();
  const [editor, setEditor] = useState<EditorState>(null);
  const [toDelete, setToDelete] = useState<ZoneRow | null>(null);
  const activeCount = zones.filter((z) => z.is_active).length;

  return (
    <div className="flex flex-col gap-5.5">
      <PageHeader
        title="Entrega"
        description={
          zones.length
            ? `${zones.length} ${zones.length === 1 ? "zona" : "zonas"} · ${activeCount} ${activeCount === 1 ? "ativa" : "ativas"}`
            : "Defina onde você entrega, a taxa e o tempo estimado."
        }
        actions={
          <Button size="md" className="font-extrabold" onClick={() => setEditor({ mode: "create" })}>
            <Plus size={16} strokeWidth={2.1} aria-hidden="true" />
            Nova zona
          </Button>
        }
      />

      <div role="note" className="flex items-start gap-3 rounded-2xl border border-brand-soft-border bg-brand-tint px-4 py-3.5">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Info size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-body text-ink">Cálculo por distância em breve</p>
          <p className="text-caption text-ink-muted">
            Por enquanto a taxa é definida por bairro ou por faixa de CEP. Quando um endereço se encaixa em mais de uma
            zona, a faixa de CEP tem prioridade.
          </p>
        </div>
      </div>

      {zones.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-line-strong">
          <EmptyState
            icon={MapPinned}
            title="Nenhuma zona de entrega"
            description="Sem zonas ativas, os clientes não conseguem pedir delivery."
            action={
              <Button size="md" onClick={() => setEditor({ mode: "create" })}>
                Criar primeira zona
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {zones.map((zone) => (
            <li key={zone.id} className="min-w-0">
              <ZoneCard zone={zone} onEdit={() => setEditor({ mode: "edit", zone })} onDelete={() => setToDelete(zone)} />
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setEditor({ mode: "create" })}
              className="flex h-full min-h-36 w-full items-center justify-center gap-2 rounded-4xl border border-dashed border-line-strong p-5 text-body-sm font-bold text-ink-muted transition-[border-color,color] duration-150 ease-out hover:border-control hover:text-ink"
            >
              <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
              Nova zona
            </button>
          </li>
        </ul>
      )}

      <ZoneFormModal
        key={editor ? (editor.mode === "edit" ? editor.zone.id : "new") : "closed"}
        open={editor != null}
        zone={editor?.mode === "edit" ? editor.zone : null}
        onOpenChange={(open) => !open && setEditor(null)}
      />

      <ConfirmationDialog
        open={toDelete != null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Excluir a zona ${toDelete?.name ?? ""}?`}
        description="Endereços desta área deixam de ser atendidos. Pedidos antigos mantêm a taxa cobrada."
        confirmLabel="Excluir zona"
        tone="danger"
        onConfirm={async () => {
          if (!toDelete) return;
          const res = await deleteZoneAction(rid, toDelete.id);
          if (!res.ok) {
            notify.error(res.error ?? "Não foi possível excluir a zona.");
            throw new Error("delete failed");
          }
          notify.success(`Zona ${toDelete.name} excluída`);
        }}
      />
    </div>
  );
}

function ZoneCard({ zone, onEdit, onDelete }: { zone: ZoneRow; onEdit: () => void; onDelete: () => void }) {
  const rid = useRestaurantId();
  const [active, setActive] = useOptimistic(zone.is_active);
  const [pending, startTransition] = useTransition();
  const extra = zone.neighborhoods.length - MAX_CHIPS;

  return (
    <article
      aria-label={zone.name}
      className={cn(
        "flex h-full flex-col gap-4 rounded-4xl border border-line bg-surface p-5 transition-opacity duration-150 ease-out",
        !active && "bg-surface-subtle",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className={cn("truncate text-item font-extrabold", active ? "text-ink" : "text-ink-muted")}>{zone.name}</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={zone.type === "CEP_RANGE" ? "info" : "neutral"} size="sm">
              {ZONE_TYPE_BADGE[zone.type]}
            </Badge>
            {!active && (
              <Badge tone="warning" size="sm">
                INATIVA
              </Badge>
            )}
          </div>
        </div>
        <Switch
          checked={active}
          disabled={pending}
          aria-label={active ? `Desativar ${zone.name}` : `Ativar ${zone.name}`}
          onCheckedChange={(next) =>
            startTransition(safely(async () => {
              setActive(next);
              const res = await setZoneActiveAction(rid, zone.id, next);
              if (!res.ok) notify.error(res.error ?? "Não foi possível atualizar a zona.");
              else notify.success(next ? `Zona ${zone.name} ativada` : `Zona ${zone.name} desativada`);
            }))
          }
        />
      </header>

      <div className="flex-1">
        {zone.type === "NEIGHBORHOOD" && (
          <p className="mb-2 text-body-sm text-ink-muted">{zone.city && zone.state ? `${zone.city} / ${zone.state}` : "Município/UF pendentes de revisão"}</p>
        )}
        {zone.type === "CEP_RANGE" ? (
          <p className="flex flex-wrap items-center gap-2 text-body-sm tabular-nums text-ink-secondary">
            <span>{zone.cep_start}</span>
            <span aria-hidden="true" className="text-ink-ghost">
              →
            </span>
            <span className="sr-only">até</span>
            <span>{zone.cep_end}</span>
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" aria-label="Bairros">
            {zone.neighborhoods.slice(0, MAX_CHIPS).map((n) => (
              <li key={n} className="rounded-md border border-line bg-surface-muted px-2.5 py-1.5 text-caption font-semibold text-ink-secondary">
                {n}
              </li>
            ))}
            {extra > 0 && (
              <li className="rounded-md px-1.5 py-1.5 text-caption font-bold text-ink-muted">+{extra}</li>
            )}
          </ul>
        )}
      </div>

      <footer className="flex items-end justify-between gap-3 border-t border-line pt-3.5">
        <dl className="flex flex-wrap gap-x-5 gap-y-2">
          <ZoneStat label="Taxa">
            {zone.fee_cents === 0 ? (
              <span className="text-success">Grátis</span>
            ) : (
              <span className="text-brand">{formatMoney(zone.fee_cents)}</span>
            )}
          </ZoneStat>
          <ZoneStat label="Mínimo">{zone.min_order_cents ? formatMoney(zone.min_order_cents) : "—"}</ZoneStat>
          <ZoneStat label="Tempo">{zone.est_minutes ? `${zone.est_minutes} min` : "—"}</ZoneStat>
        </dl>
        <div className="flex shrink-0 gap-2">
          <IconButton label={`Editar ${zone.name}`} icon={Pencil} size={34} variant="outline" onClick={onEdit} />
          <IconButton label={`Excluir ${zone.name}`} icon={Trash2} size={34} variant="outline" onClick={onDelete} />
        </div>
      </footer>
    </article>
  );
}

function ZoneStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-micro font-extrabold tracking-wider text-ink-faint uppercase">{label}</dt>
      <dd className="text-body font-extrabold whitespace-nowrap text-ink">{children}</dd>
    </div>
  );
}
