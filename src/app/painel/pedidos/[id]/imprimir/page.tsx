import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintControls } from "@/components/orders/print-controls";
import { Receipt, RECEIPT_PRINT_CSS } from "@/components/orders/receipt";
import { ADMIN_ROLES } from "@/lib/role-home";
import { requireMember } from "@/server/auth";
import { getOrderDetail, getRestaurantInfo } from "@/server/orders/queries";

export const metadata: Metadata = { title: "Imprimir pedido" };

/** 80mm thermal receipt. `?autoprint=1` opens the print dialog on load. */
export default async function ImprimirPedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoprint?: string }>;
}) {
  const { restaurantId } = await requireMember(ADMIN_ROLES);
  const [{ id }, { autoprint }] = await Promise.all([params, searchParams]);
  const [order, restaurant] = await Promise.all([getOrderDetail(restaurantId, id), getRestaurantInfo(restaurantId)]);
  if (!order) notFound();

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      {/* No href/precedence: React renders this <style> in place (not hoisted/deduped into <head>), so it
          unmounts with the page and the print rules never leak into the board after client navigation. */}
      <style>{RECEIPT_PRINT_CSS}</style>
      <PrintControls autoPrint={autoprint === "1"} backHref={`/painel/pedidos?pedido=${order.id}`} />
      <div className="rounded-sm border border-line shadow-card">
        <Receipt order={order} restaurant={restaurant} />
      </div>
    </div>
  );
}
