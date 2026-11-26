import type { Metadata } from "next";
import { ZonesView } from "@/components/zones/zones-view";
import type { ZoneRow } from "@/components/zones/types";
import { ZONE_ROLES } from "@/lib/schemas/zone";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";

export const metadata: Metadata = { title: "Entrega" };

/** Delivery zones (OWNER/MANAGER): by neighbourhood or CEP range, with fee, minimum and estimated time. */
export default async function EntregaPage() {
  const { restaurantId } = await requireMember(ZONE_ROLES);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id, name, type, neighborhoods, city, state, cep_start, cep_end, fee_cents, min_order_cents, est_minutes, is_active, position")
    .eq("restaurant_id", restaurantId)
    .order("position")
    .order("created_at");
  if (error) throw new Error(`Failed to load delivery zones: ${error.message}`);

  return <ZonesView zones={(data ?? []) as ZoneRow[]} />;
}
