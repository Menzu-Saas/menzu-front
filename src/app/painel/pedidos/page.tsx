import type { Metadata } from "next";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OrdersBoard } from "@/components/orders/orders-board";
import { formatDayLong } from "@/lib/order-board";
import { ADMIN_ROLES } from "@/lib/role-home";
import { requireMember } from "@/server/auth";
import { getRestaurantInfo, listBoardOrders } from "@/server/orders/queries";
import { isPreviewRestaurant, previewOrders } from "@/lib/restaurant-preview";
import type { BoardOrder } from "@/lib/order-board";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { isUuid } from "@/lib/uuid";

export const metadata: Metadata = { title: "Pedidos" };

/** Orders board (reference P2). KITCHEN has no RLS access to orders, so the board is admin roles only. */
export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ pedido?: string | string[]; referencia?: string | string[] }> }) {
  const { restaurantId, role, restaurant } = await requireMember(ADMIN_ROLES);
  const { pedido, referencia } = await searchParams;
  const reference = typeof referencia === "string" ? referencia.trim().slice(0, 40) : "";
  const selectedOrderId = isUuid(pedido) ? pedido : null;
  let matches: { id: string; number: number; status: OrderStatus }[] = [];
  let lookupError: string | null = null;
  if (reference) {
    if (!/^[0-9a-f]{12}$/i.test(reference)) {
      lookupError = "Informe os 12 caracteres da referência mostrada no cardápio.";
    } else {
      const supabase: SupabaseClient = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("find_guest_order_attempt", {
        p_restaurant_id: restaurantId, p_reference: reference,
      });
      if (error) lookupError = "Não foi possível consultar a referência agora.";
      else if (Array.isArray(data)) matches = data;
    }
  }
  const info = await getRestaurantInfo(restaurantId);
  const now = new Date();
  const orders = await listBoardOrders(restaurantId, info.timezone, now);
  const examples: BoardOrder[] = isPreviewRestaurant(restaurant) ? previewOrders(now).slice(0, 8).map(({ order, dish, quantity }, index) => ({
    ...order,
    status: index === 2 ? "PENDING" : index === 3 ? "CONFIRMED" : index === 4 ? "READY" : order.status,
    customer_name: order.customer_name + " · Demo",
    customer_phone: "",
    payment_method: "CASH",
    scheduled_for: null,
    table_number: order.type === "DINE_IN" ? 2 : null,
    confirmed_at: null,
    preparing_at: null,
    ready_at: null,
    out_for_delivery_at: null,
    delivered_at: order.status === "DELIVERED" && index >= 5 ? order.created_at : null,
    cancelled_at: null,
    items: [{ product_name: dish.name, variant_name: null, quantity }],
  })) : [];

  return (
    <div className="flex flex-col gap-4">
    <details open={Boolean(reference)} className="rounded-xl border border-line bg-surface p-4">
      <summary className="cursor-pointer font-medium">Localizar pedido por referência</summary>
      <form action="/painel/pedidos" className="mt-3 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Referência da tentativa
          <input name="referencia" maxLength={12} required pattern="[a-fA-F0-9]{12}" defaultValue={reference}
            className="rounded-md border border-line px-3 py-2 font-mono" />
        </label>
        <button type="submit" className="rounded-md border border-line px-3 py-2 text-sm">Consultar</button>
      </form>
      {reference && <div className="mt-3 text-sm" role="status">
        {lookupError ?? (matches.length ? <ul className="space-y-1">
          {matches.map((order) => <li key={order.id}>
            <Link className="underline" href={`/painel/pedidos?pedido=${order.id}`}>
              Pedido #{order.number} · {ORDER_STATUS_LABEL[order.status]}
            </Link>
          </li>)}
        </ul> : "Nenhum pedido confirmado com essa referência nesta loja. Se o cliente ainda estiver aguardando, consulte novamente antes de pedir um novo envio.")}
      </div>}
    </details>
    {examples.length > 0 && <p className="text-caption text-ink-muted">Pedidos marcados como Demo são fictícios e ficam apenas para visualização.</p>}
    <OrdersBoard
      key={`${restaurantId}:${selectedOrderId ?? ""}`}
      restaurantId={restaurantId}
      role={role}
      timeZone={info.timezone}
      avgPrepMinutes={info.avg_prep_minutes}
      dayLabel={formatDayLong(now, info.timezone)}
      serverNow={now.getTime()}
      devPayments={false}
      initialOrders={[...orders, ...examples]}
      initialOrderId={selectedOrderId}
    />
    </div>
  );
}
