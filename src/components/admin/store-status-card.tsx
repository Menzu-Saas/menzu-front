"use client";

import { ChevronsUpDown, Pause, Power, Store, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Icon,
  notify,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { RestaurantStatus } from "@/lib/types";
import { setStoreStatusAction } from "@/server/actions/restaurant-status";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";

export interface StoreStatusCardProps {
  status: RestaurantStatus;
  /** False when the status is OPEN but the clock is outside the opening hours. */
  withinHours: boolean;
  /** "Fecha às 23:00", "Abre amanhã às 11:00"… */
  detail: string | null;
  /** OWNER/MANAGER can switch the status from the card. */
  canChange: boolean;
}

type Tone = "success" | "warning" | "neutral";

const TONE: Record<Tone, { card: string; title: string }> = {
  success: { card: "border-success-border bg-success-tint", title: "text-success" },
  warning: { card: "border-warning-soft bg-warning-soft", title: "text-warning" },
  neutral: { card: "border-line bg-surface-muted", title: "text-ink-secondary" },
};

function describe(status: RestaurantStatus, withinHours: boolean, detail: string | null) {
  if (status === "PAUSED") return { tone: "warning" as Tone, title: "Loja pausada", detail: "Novos pedidos suspensos" };
  if (status === "CLOSED") return { tone: "neutral" as Tone, title: "Loja fechada", detail: "Não está recebendo pedidos" };
  if (!withinHours) return { tone: "neutral" as Tone, title: "Fora do horário", detail };
  return { tone: "success" as Tone, title: "Loja aberta", detail };
}

const OPTIONS: { status: RestaurantStatus; label: string; icon: LucideIcon; done: string }[] = [
  { status: "OPEN", label: "Abrir loja", icon: Store, done: "Loja aberta" },
  { status: "PAUSED", label: "Pausar pedidos", icon: Pause, done: "Pedidos pausados" },
  { status: "CLOSED", label: "Fechar loja", icon: Power, done: "Loja fechada" },
];

/** Sidebar footer card (reference P1 "Loja aberta · Fecha às 23:00") with a quick status menu. */
export function StoreStatusCard({ status, withinHours, detail, canChange }: StoreStatusCardProps) {
  const rid = useRestaurantId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const view = describe(status, withinHours, detail);
  const tone = TONE[view.tone];

  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className={cn("flex items-center gap-1.5 text-caption font-extrabold", tone.title)}>
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
          {view.title}
        </span>
        {view.detail && <span className="mt-1 text-micro font-normal text-ink-secondary">{view.detail}</span>}
      </span>
      {canChange && <Icon icon={ChevronsUpDown} size={16} className="text-ink-subtle" />}
    </>
  );

  const cardClass = cn("flex w-full items-center gap-2 rounded-xl border p-3.5", tone.card);

  if (!canChange) {
    return (
      <div className={cardClass} role="status">
        {body}
      </div>
    );
  }

  function change(next: RestaurantStatus, done: string) {
    startTransition(safely(async () => {
      const result = await setStoreStatusAction(rid, next);
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      notify.success(done);
      router.refresh();
    }));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${view.title}. Alterar status da loja`}
        aria-busy={pending || undefined}
        disabled={pending}
        className={cn(
          cardClass,
          "cursor-pointer transition-[border-color,opacity] duration-150 ease-out hover:border-line-strong disabled:opacity-60",
        )}
      >
        {body}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width)">
        <DropdownMenuLabel>Status da loja</DropdownMenuLabel>
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.status}
            icon={option.icon}
            disabled={option.status === status}
            onSelect={() => change(option.status, option.done)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
