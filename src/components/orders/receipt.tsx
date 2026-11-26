import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { formatDateTime, PAYMENT_METHOD_LABEL } from "@/lib/order-board";
import { formatPhone } from "@/lib/phone";
import { PAYMENT_STATUS_BADGE } from "@/components/ui/status-badge";
import type { OrderDetail, RestaurantPrintInfo } from "@/server/orders/queries";

/**
 * Print rules. 80mm roll, 4mm margins (72mm printable). In print, everything that neither is nor
 * contains the receipt is removed and the receipt's ancestors are flattened, so the admin shell around
 * this page (sidebar, paddings, card frames) never reaches the paper.
 */
export const RECEIPT_PRINT_CSS = `
@page { size: 80mm auto; margin: 4mm; }
@media print {
  html, body { background: var(--mz-print-paper) !important; color: var(--mz-print-ink) !important; }
  body :not(:has(.mz-receipt)):not(.mz-receipt):not(.mz-receipt *) { display: none !important; }
  body :has(.mz-receipt) {
    display: block !important; position: static !important; margin: 0 !important; padding: 0 !important;
    border: 0 !important; box-shadow: none !important; background: none !important; width: auto !important;
    max-width: none !important; min-height: 0 !important; height: auto !important; overflow: visible !important;
  }
  .mz-receipt { width: 72mm !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }
  .mz-no-print { display: none !important; }
}
`;

const TYPE_LABEL = { DELIVERY: "ENTREGA", PICKUP: "RETIRADA", DINE_IN: "MESA" } as const;

function Rule() {
  return <div aria-hidden="true" className="my-2 border-t border-dashed border-print-ink" />;
}

/** "2x Classic Burger ....... R$ 53,80" — the dots fill whatever width is left; a wrapped name keeps dots and price on its last line. */
function Leader({ left, right, strong = false }: { left: ReactNode; right: ReactNode; strong?: boolean }) {
  return (
    <div className={cn("flex items-end gap-1", strong && "font-medium")}>
      <span className="min-w-0 shrink break-words">{left}</span>
      <span aria-hidden="true" className="min-w-2 flex-1 overflow-hidden whitespace-nowrap">
        {".".repeat(80)}
      </span>
      <span className="shrink-0 whitespace-nowrap">{right}</span>
    </div>
  );
}

export function Receipt({ order, restaurant }: { order: OrderDetail; restaurant: RestaurantPrintInfo }) {
  const tz = restaurant.timezone;
  const restaurantAddress = [
    [restaurant.address_street, restaurant.address_number].filter(Boolean).join(", "),
    [restaurant.address_neighborhood, [restaurant.address_city, restaurant.address_state].filter(Boolean).join("/")]
      .filter(Boolean)
      .join(" - "),
  ].filter(Boolean);
  const a = order.address;
  const payment = order.payment;

  return (
    <article
      aria-label={`Comanda do pedido #${order.number}`}
      className="mz-receipt w-[80mm] max-w-full bg-print-paper p-[4mm] font-mono text-caption leading-snug text-print-ink"
    >
      <header className="text-center">
        <p className="text-body font-medium uppercase">{restaurant.name}</p>
        {restaurantAddress.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {restaurant.phone && <p>Tel. {formatPhone(restaurant.phone)}</p>}
      </header>
      <Rule />
      <div className="text-center">
        <p className="text-title-md font-medium tracking-normal">#{order.number}</p>
        <p>{formatDateTime(order.created_at, tz)}</p>
        <p className="font-medium">
          {TYPE_LABEL[order.type]}
          {order.type === "DINE_IN" && order.table_number != null && ` ${order.table_number}`}
        </p>
        {order.scheduled_for && <p className="font-medium">AGENDADO: {formatDateTime(order.scheduled_for, tz)}</p>}
        {order.status === "CANCELLED" && <p className="font-medium">*** CANCELADO ***</p>}
      </div>
      <Rule />
      <div>
        <p>Cliente: {order.customer_name}</p>
        <p>Tel.: {formatPhone(order.customer_phone)}</p>
        {order.type === "DELIVERY" && a && (
          <>
            <p>
              End.: {[a.street, a.number].filter(Boolean).join(", ")}
              {a.complement && ` - ${a.complement}`}
            </p>
            <p>{[a.neighborhood, [a.city, a.state].filter(Boolean).join("/")].filter(Boolean).join(" - ")}</p>
            {a.cep && <p>CEP {a.cep}</p>}
            {a.reference && <p>Ref.: {a.reference}</p>}
          </>
        )}
      </div>
      <Rule />
      <div className="flex flex-col gap-1">
        {order.items.map((item) => (
          <div key={item.id}>
            <Leader
              left={`${item.quantity}x ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ""}`}
              right={formatMoney(item.total_cents)}
            />
            {item.addons.map((ad) => (
              <p key={ad.id} className="pl-[4mm]">
                + {ad.quantity > 1 ? `${ad.quantity}x ` : ""}
                {ad.option_name}
              </p>
            ))}
            {item.notes && <p className="pl-[4mm]">Obs.: {item.notes}</p>}
          </div>
        ))}
      </div>
      <Rule />
      <div className="flex flex-col gap-0.5">
        <Leader left="Subtotal" right={formatMoney(order.subtotal_cents)} />
        {order.discount_cents > 0 && (
          <Leader
            left={order.coupon_code ? `Desconto (${order.coupon_code})` : "Desconto"}
            right={`-${formatMoney(order.discount_cents)}`}
          />
        )}
        {order.type === "DELIVERY" && (
          <Leader
            left="Taxa de entrega"
            right={order.delivery_fee_cents > 0 ? formatMoney(order.delivery_fee_cents) : "Grátis"}
          />
        )}
        <Leader left="TOTAL" right={formatMoney(order.total_cents)} strong />
      </div>
      <Rule />
      <div>
        <p>
          Pagamento: {PAYMENT_METHOD_LABEL[order.payment_method]}
          {payment && ` (${PAYMENT_STATUS_BADGE[payment.status].label})`}
        </p>
        {order.payment_method === "CASH" && order.change_for_cents != null && (
          <>
            <p>Troco para: {formatMoney(order.change_for_cents)}</p>
            <p className="font-medium">Levar troco: {formatMoney(order.change_for_cents - order.total_cents)}</p>
          </>
        )}
      </div>
      {order.notes && (
        <>
          <Rule />
          <p>Obs. do pedido: {order.notes}</p>
        </>
      )}
      <Rule />
      <p className="text-center">Pedido via Menzu</p>
    </article>
  );
}
