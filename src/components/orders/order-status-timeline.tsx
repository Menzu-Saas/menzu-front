import { cn } from "@/lib/cn";
import { formatTime, HISTORY_LABEL, statusPath } from "@/lib/order-board";
import type { OrderStatus, OrderType } from "@/lib/order-status";
import type { OrderDetailHistory } from "@/server/orders/queries";

/**
 * Status history in the reference tracking-timeline style (07 · Rastreamento): 14px dots — filled
 * success for steps that happened, 2px strong-border ring for steps still ahead — label 14/700 and the
 * time at the right (12, faint; "—" ghost when pending).
 */
export function OrderStatusTimeline({
  history,
  status,
  type,
  timeZone,
}: {
  history: OrderDetailHistory[];
  status: OrderStatus;
  type: OrderType;
  timeZone: string;
}) {
  const done = new Set(history.map((h) => h.to_status));
  const ahead =
    status === "CANCELLED" || status === "DELIVERED"
      ? []
      : statusPath(type).filter((s) => !done.has(s) && s !== status);

  return (
    <ol className="flex flex-col gap-3.5">
      {history.map((h) => {
        const cancelled = h.to_status === "CANCELLED";
        const meta = [h.actor_name, h.note].filter(Boolean).join(" · ");
        return (
          <li key={h.id} className="flex gap-3">
            <span
              aria-hidden="true"
              className={cn("mt-0.75 size-3.5 shrink-0 rounded-full", cancelled ? "bg-danger" : "bg-success")}
            />
            <div className="min-w-0 flex-1">
              <p className={cn("text-body font-bold", cancelled ? "text-danger" : "text-ink")}>{HISTORY_LABEL[h.to_status]}</p>
              {meta && <p className="text-caption text-ink-muted">{meta}</p>}
            </div>
            <time dateTime={h.created_at} className="text-caption text-ink-faint">
              {formatTime(h.created_at, timeZone)}
            </time>
          </li>
        );
      })}
      {ahead.map((s) => (
        <li key={s} className="flex gap-3">
          <span aria-hidden="true" className="mt-0.75 size-3.5 shrink-0 rounded-full border-2 border-line-strong" />
          <p className="flex-1 text-body text-ink-subtle">{HISTORY_LABEL[s]}</p>
          <span className="text-caption text-ink-ghost">—</span>
        </li>
      ))}
    </ol>
  );
}
