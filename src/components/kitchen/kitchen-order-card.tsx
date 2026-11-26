import { CalendarClock, ChefHat, CircleCheck, MessageSquareText } from "lucide-react";
import { Badge, Button, Icon } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  addonLabel,
  formatTimer,
  kitchenSince,
  kitchenTypeLabel,
  timerTone,
  type KitchenOrder,
  type TimerTone,
} from "@/lib/kitchen";
import { formatBoardSchedule } from "@/lib/order-board";

const TIMER_CLASS: Record<TimerTone, string> = {
  normal: "border-line bg-surface-muted text-ink",
  warning: "border-transparent bg-warning-soft text-warning",
  danger: "border-transparent bg-danger-soft text-danger",
};

export interface KitchenOrderCardProps {
  order: KitchenOrder;
  now: number;
  avgPrepMinutes: number;
  timeZone: string;
  busy: boolean;
  onAdvance: (order: KitchenOrder) => void;
}

/** Large kitchen ticket (r20, p20): number, type, running timer, items with addons/notes and one big action. */
export function KitchenOrderCard({ order, now, avgPrepMinutes, timeZone, busy, onAdvance }: KitchenOrderCardProps) {
  const elapsed = now - kitchenSince(order, avgPrepMinutes);
  // Scheduled order not due yet: the clock counts down to when cooking should start.
  const upcoming = elapsed < 0;
  const tone = upcoming ? "normal" : timerTone(elapsed, avgPrepMinutes);
  const preparing = order.status === "PREPARING";

  return (
    <article
      aria-label={`Pedido #${order.number}`}
      className={cn(
        "flex flex-col gap-4 rounded-4xl border bg-surface p-5",
        tone === "danger" ? "border-brand-tint-border" : "border-line",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="font-mono text-title-md text-ink">#{order.number}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={order.type === "DINE_IN" ? "brand" : "neutral"}>{kitchenTypeLabel(order).toUpperCase()}</Badge>
            {order.scheduled_for && (
              <Badge tone="info">
                <Icon icon={CalendarClock} size={16} />
                Agendado · {formatBoardSchedule(order.scheduled_for, timeZone, now)}
              </Badge>
            )}
            {order.customer_first_name && <span className="text-caption font-semibold text-ink-muted">{order.customer_first_name}</span>}
          </div>
        </div>
        <span
          role="timer"
          aria-label={
            upcoming ? `Preparo começa em ${formatTimer(-elapsed)}` : `Tempo de preparo: ${formatTimer(elapsed)}`
          }
          className={cn(
            "flex shrink-0 flex-col items-end rounded-xl border px-3 py-1.5 text-heading tabular-nums",
            TIMER_CLASS[tone],
          )}
        >
          {upcoming && <span className="text-micro font-bold uppercase text-ink-muted">Começa em</span>}
          {formatTimer(upcoming ? -elapsed : elapsed)}
        </span>
      </header>

      <ul className="flex flex-col gap-3 border-t border-line pt-4">
        {order.items.map((item, idx) => (
          <li key={idx} className="flex flex-col gap-2">
            <p className="text-subheading font-bold text-ink">
              <span className="mr-1.5 text-brand">{item.quantity}×</span>
              {item.product_name}
              {item.variant_name && <span className="text-ink-secondary"> · {item.variant_name}</span>}
            </p>
            {(item.addons.length > 0 || item.notes) && (
              <div className="flex flex-col gap-1 rounded-xl border border-brand-soft-border bg-brand-tint px-3.5 py-2.5">
                {item.addons.map((a, i) => (
                  <p key={i} className="text-body text-ink">
                    <span className="font-extrabold text-brand">+ </span>
                    {addonLabel(a)}
                    {a.group_name && <span className="text-caption font-semibold text-ink-muted"> · {a.group_name}</span>}
                  </p>
                ))}
                {item.notes && (
                  <p className="text-body font-extrabold text-brand">
                    <span className="eyebrow mr-1.5">Obs.</span>
                    {item.notes}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <div className="flex gap-2.5 rounded-xl border border-brand-soft-border bg-brand-tint px-3.5 py-3 text-brand">
          <Icon icon={MessageSquareText} size={20} className="mt-px" />
          <div className="flex flex-col gap-0.5">
            <span className="eyebrow">Observações do pedido</span>
            <p className="text-body font-bold text-ink">{order.notes}</p>
          </div>
        </div>
      )}

      <Button
        size="xl"
        block
        variant={preparing ? "success" : "primary"}
        loading={busy}
        disabled={order.id.startsWith("preview:")}
        onClick={() => onAdvance(order)}
      >
        {!busy && <Icon icon={preparing ? CircleCheck : ChefHat} size={20} />}
        {preparing ? "Pronto" : "Iniciar preparo"}
      </Button>
    </article>
  );
}
