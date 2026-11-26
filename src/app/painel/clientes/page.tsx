import type { Metadata } from "next";
import { CustomersView, type CustomerRow } from "@/components/customers/customers-view";
import { PageHeader } from "@/components/ui";
import { customerSearch, formatLastPurchase } from "@/lib/customers";
import { ADMIN_ROLES } from "@/lib/role-home";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { getRestaurantClock } from "@/server/queries/dashboard";
import { isPreviewRestaurant, previewCustomers, previewOrders, PREVIEW_ID } from "@/lib/restaurant-preview";

export const metadata: Metadata = { title: "Clientes" };

const LIST_LIMIT = 300;

/** Customers (OWNER/MANAGER/ATTENDANT): searchable list with stats; a row opens the history drawer. */
export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { restaurantId, restaurant } = await requireMember(ADMIN_ROLES);
  const rawQ = (await searchParams).q;
  const search = customerSearch(rawQ);
  // Shown back as typed (rendered as text); the filter only uses the parsed `search`.
  const q = search ? (Array.isArray(rawQ) ? rawQ[0] : (rawQ ?? "")).trim().slice(0, 60) : "";
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("customer_stats")
    .select("id, name, phone, orders_count, total_spent_cents, avg_ticket_cents, last_order_at", { count: "exact" })
    .eq("restaurant_id", restaurantId);
  // Digits and phone punctuation ("(11) 98765-4321") → phone search; anything else → name search.
  if (search?.kind === "phone") query = query.ilike("phone", `%${search.digits}%`);
  else if (search?.kind === "name") query = query.ilike("name", `%${search.term}%`);
  const [{ data, count, error }, clock] = await Promise.all([
    query.order("last_order_at", { ascending: false, nullsFirst: false }).order("name").limit(LIST_LIMIT),
    getRestaurantClock(restaurantId),
  ]);
  if (error) throw new Error(`Failed to load customers: ${error.message}`);

  const now = new Date();
  const rows: CustomerRow[] = (data ?? [])
    .filter((c) => c.id && c.name && c.phone)
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      phone: c.phone as string,
      orders_count: c.orders_count ?? 0,
      total_spent_cents: c.total_spent_cents ?? 0,
      avg_ticket_cents: c.avg_ticket_cents ?? 0,
      last_order_at: c.last_order_at,
      last_order_label: formatLastPurchase(c.last_order_at, now, clock.timezone),
    }));

  const examples = isPreviewRestaurant(restaurant) && search?.kind !== "phone"
    ? previewCustomers.filter((name) => !q || name.toLowerCase().includes(q.toLowerCase())).map((name) => {
      const orders = previewOrders(now).map(({ order }) => order).filter((order) => order.customer_name === name);
      const spent = orders.reduce((sum, order) => sum + order.total_cents, 0);
      return { id: PREVIEW_ID + name, name, phone: "—", orders_count: orders.length, total_spent_cents: spent,
        avg_ticket_cents: Math.round(spent / orders.length), last_order_at: orders[0].created_at,
        last_order_label: formatLastPurchase(orders[0].created_at, now, clock.timezone) };
    }) : [];
  const total = (count ?? rows.length) + examples.length;
  return (
    <div className="flex flex-col gap-5.5">
      <PageHeader
        title="Clientes"
        description={
          q
            ? `${total} ${total === 1 ? "resultado" : "resultados"} para “${q}”`
            : `${total} ${total === 1 ? "cliente" : "clientes"} que já pediram na sua loja`
        }
      />
      {examples.length > 0 && <p className="text-caption text-ink-muted">Inclui clientes de demonstração sem telefone.</p>}
      <CustomersView rows={[...rows, ...examples]} query={q} timeZone={clock.timezone} truncated={total > rows.length + examples.length} />
    </div>
  );
}
