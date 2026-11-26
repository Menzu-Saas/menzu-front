import "server-only";

import type { PaymentMethod, RestaurantStatus } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface RestaurantSettings {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  status: RestaurantStatus;
  min_order_cents: number;
  avg_prep_minutes: number;
  default_delivery_fee_cents: number;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  accepts_dine_in: boolean;
  accepts_scheduling: boolean;
  payment_methods: PaymentMethod[];
}

export interface HourRow {
  weekday: number;
  opens_at: string;
  closes_at: string;
}

const COLUMNS =
  "id, slug, name, description, phone, whatsapp, instagram, logo_url, banner_url, primary_color, address_cep, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, status, min_order_cents, avg_prep_minutes, default_delivery_fee_cents, accepts_delivery, accepts_pickup, accepts_dine_in, accepts_scheduling, payment_methods";

/** Everything the settings screen edits, for the current restaurant (RLS: members). */
export async function getRestaurantSettings(restaurantId: string): Promise<RestaurantSettings | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("restaurants").select(COLUMNS).eq("id", restaurantId).maybeSingle();
  if (error) throw new Error(`Failed to load restaurant settings: ${error.message}`);
  return (data as unknown as RestaurantSettings) ?? null;
}

/** Weekly opening windows ordered by weekday and opening time. */
export async function getOpeningHours(restaurantId: string): Promise<HourRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("opening_hours")
    .select("weekday, opens_at, closes_at")
    .eq("restaurant_id", restaurantId)
    .order("weekday")
    .order("opens_at");
  if (error) throw new Error(`Failed to load opening hours: ${error.message}`);
  return data ?? [];
}

export interface RestaurantTableRow {
  id: string;
  number: number;
  label: string | null;
}

/** Tables (QR codes) ordered by number. */
export async function getRestaurantTables(restaurantId: string): Promise<RestaurantTableRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("id, number, label")
    .eq("restaurant_id", restaurantId)
    .order("number");
  if (error) throw new Error(`Failed to load tables: ${error.message}`);
  return data ?? [];
}
