import { Banknote, Bike, CircleCheck, MapPin, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Button, Icon, IconButton, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { cityLine, collectionFor, mapsUrl, paymentNote, streetLine, type DeliveryOrder } from "@/lib/delivery";
import { formatElapsed, formatTime, PAYMENT_METHOD_LABEL } from "@/lib/order-board";
import { formatMoney } from "@/lib/money";
import { formatPhone, telLink, whatsappLink } from "@/lib/phone";

export interface DeliveryOrderCardProps {
  order: DeliveryOrder;
  now: number;
  timeZone: string;
  restaurantName: string;
  busy: "status" | "payment" | null;
  onAdvance: (order: DeliveryOrder) => void;
  onReceive: (order: DeliveryOrder) => void;
  compact?: boolean;
  onTrack?: () => void;
}

/** Courier card: address (neighborhood first), contact, map, amount to collect and the next step. */
export function DeliveryOrderCard({ order, now, timeZone, restaurantName, busy, onAdvance, onReceive, compact = false, onTrack }: DeliveryOrderCardProps) {
  const a = order.address;
  const map = mapsUrl(a);
  const collect = collectionFor(order);
  const onRoute = order.status === "OUT_FOR_DELIVERY";
  const delivered = order.status === "DELIVERED";
  // mark_payment_paid lets DELIVERY collect only once the order left the restaurant.
  const canReceive = !!collect && (onRoute || delivered);
  const since = onRoute ? order.out_for_delivery_at : delivered ? order.delivered_at : order.ready_at;

  let meta: ReactNode = null;
  if (since) meta = delivered ? `Entregue às ${formatTime(since, timeZone)}` : formatElapsed(now - new Date(since).getTime());

  return (
    <article
      aria-label={`Pedido #${order.number}`}
      className={cn("flex flex-col gap-4 rounded-4xl border border-line bg-surface", compact ? "p-4" : "p-5")}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-mono text-title-md text-ink">#{order.number}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={order.status} suffix={typeof meta === "string" && !delivered ? meta : undefined} />
            {delivered && meta && <span className="text-caption font-semibold text-ink-muted">{meta}</span>}
          </div>
        </div>
        {map && !delivered && (
          <Button asChild variant="soft" size="lg">
            <a href={map} target="_blank" rel="noopener noreferrer">
              <Icon icon={MapPin} size={20} />
              Abrir no Maps
            </a>
          </Button>
        )}
      </header>

      {onRoute && onTrack && <Button variant="outline" disabled title="GPS indisponível: o app do entregador não faz parte desta BETA."><Icon icon={Bike} size={18}/>GPS indisponível nesta BETA</Button>}
      {!compact && (
        <div className="flex flex-col gap-1">
          <span className="eyebrow text-ink-faint">Entregar em</span>
          {a?.neighborhood && <p className="text-title-sm text-ink">{a.neighborhood}</p>}
          {streetLine(a) && <p className="text-body text-ink">{streetLine(a)}</p>}
          {cityLine(a) && <p className="text-caption text-ink-muted">{cityLine(a)}</p>}
          {a?.reference && (
            <p className="mt-1 rounded-xl bg-surface-sunken px-3.5 py-2.5 text-body-sm text-ink-secondary">
              <span className="font-extrabold text-ink">Referência:</span> {a.reference}
            </p>
          )}
          {order.notes && (
            <p className="mt-1 rounded-xl border border-brand-soft-border bg-brand-tint px-3.5 py-2.5 text-body-sm text-ink">
              <span className="font-extrabold text-brand">Obs.:</span> {order.notes}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-item text-ink">{order.customer_name}</span>
          <span className="text-caption text-ink-muted">{formatPhone(order.customer_phone)}</span>
        </div>
        <IconButton asChild size={48} icon={Phone} label={`Ligar para ${order.customer_name}`}>
          <a href={telLink(order.customer_phone)} />
        </IconButton>
        <IconButton asChild size={48} icon={MessageCircle} label={`WhatsApp de ${order.customer_name}`}>
          <a
            href={whatsappLink(
              order.customer_phone,
              `Olá, ${order.customer_name.split(" ")[0]}! Aqui é a equipe do ${restaurantName}, pedido #${order.number}.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
          />
        </IconButton>
      </div>

      {collect ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-tint-border bg-brand-tint p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="eyebrow text-brand">Cobrar na entrega</span>
              <span className="text-title-md text-ink">{formatMoney(collect.amountCents)}</span>
              <span className="text-body-sm text-ink-secondary">{PAYMENT_METHOD_LABEL[collect.method]}</span>
            </div>
            <Icon icon={Banknote} size={24} className="text-brand" />
          </div>
          {collect.changeCents != null && collect.changeForCents != null && (
            <p className="rounded-xl bg-surface px-3.5 py-2.5 text-body-sm text-ink">
              Troco para {formatMoney(collect.changeForCents)} ·{" "}
              <span className="font-extrabold">levar {formatMoney(collect.changeCents)}</span>
            </p>
          )}
          {canReceive ? (
            <Button variant="success" size="md" block loading={busy === "payment"} disabled={busy === "status"} onClick={() => onReceive(order)}>
              {busy !== "payment" && <Icon icon={Banknote} size={18} />}
              Receber pagamento
            </Button>
          ) : (
            <p className="text-caption text-ink-muted">Registre o pagamento depois que o pedido sair para entrega.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={order.payment?.status === "PAID" ? "success" : "neutral"}>{paymentNote(order).toUpperCase()}</Badge>
          {order.payment && <span className="text-caption text-ink-muted">{PAYMENT_METHOD_LABEL[order.payment.method]}</span>}
        </div>
      )}

      {!delivered && (
        <Button
          size="xl"
          block
          variant={onRoute ? "success" : "primary"}
          loading={busy === "status"}
          disabled={busy === "payment"}
          onClick={() => onAdvance(order)}
        >
          {busy !== "status" && <Icon icon={onRoute ? CircleCheck : Bike} size={20} />}
          {onRoute ? "Entregue" : "Saiu para entrega"}
        </Button>
      )}
    </article>
  );
}
