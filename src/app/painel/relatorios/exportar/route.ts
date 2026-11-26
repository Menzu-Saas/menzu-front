import { MANAGEMENT_ROLES } from "@/lib/roles";
import { centsToCsv, toCsv, type CsvColumn } from "@/lib/csv";
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL } from "@/lib/order-status";
import { parseReportRange } from "@/lib/reports";
import { PAYMENT_METHOD_LABEL } from "@/lib/schemas/settings";
import { requireMember } from "@/server/auth";
import { getRestaurantClock } from "@/server/queries/dashboard";
import { getOrdersForExport, type ExportOrder } from "@/server/queries/reports";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  PAID: "Pago",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
  CANCELLED: "Cancelado",
};

/** GET /painel/relatorios/exportar?periodo=…|de=…&ate=… → orders of the range as CSV (Excel pt-BR). */
export async function GET(request: Request) {
  const { restaurantId, restaurant } = await requireMember(MANAGEMENT_ROLES);
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const clock = await getRestaurantClock(restaurantId);
  const range = parseReportRange(params, new Date(), clock.timezone);
  const orders = await getOrdersForExport(restaurantId, range);

  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: clock.timezone, day: "2-digit", month: "2-digit", year: "numeric" });
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: clock.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const address = (o: ExportOrder) => (o.address && typeof o.address === "object" ? (o.address as Record<string, string | undefined>) : {});

  const columns: CsvColumn<ExportOrder>[] = [
    { header: "Pedido", value: (o) => o.number },
    { header: "Data", value: (o) => date.format(new Date(o.created_at)) },
    { header: "Hora", value: (o) => time.format(new Date(o.created_at)) },
    { header: "Tipo", value: (o) => ORDER_TYPE_LABEL[o.type] },
    { header: "Status", value: (o) => ORDER_STATUS_LABEL[o.status] },
    { header: "Cliente", value: (o) => o.customer_name },
    { header: "Telefone", value: (o) => o.customer_phone },
    { header: "Mesa", value: (o) => o.table_number },
    { header: "Bairro", value: (o) => address(o).neighborhood },
    { header: "Pagamento", value: (o) => PAYMENT_METHOD_LABEL[o.payment_method] ?? o.payment_method },
    { header: "Status do pagamento", value: (o) => PAYMENT_STATUS_LABEL[o.payments?.[0]?.status ?? ""] ?? "" },
    { header: "Cupom", value: (o) => o.coupon?.code },
    { header: "Subtotal (R$)", value: (o) => centsToCsv(o.subtotal_cents) },
    { header: "Desconto (R$)", value: (o) => centsToCsv(o.discount_cents) },
    { header: "Taxa de entrega (R$)", value: (o) => centsToCsv(o.delivery_fee_cents) },
    { header: "Total (R$)", value: (o) => centsToCsv(o.total_cents) },
    { header: "Motivo do cancelamento", value: (o) => o.cancel_reason },
  ];

  const filename = `pedidos-${restaurant.slug}-${range.fromDay}-a-${range.toDay}.csv`;
  return new Response(toCsv(orders, columns), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
