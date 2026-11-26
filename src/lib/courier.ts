export type CourierPosition = { latitude: number; longitude: number; accuracy: number; recorded_at: string; stale: boolean };
export type CourierAssignment = {
  order_id: string; user_id: string | null; number: number; status: string;
  remuneration_confirmed?: boolean; base_cents: number; bonus_cents: number; offered_at: string; accepted_at: string | null;
  picked_up_at: string | null; completed_at: string | null; approved_at: string | null;
  customer_name: string | null; customer_phone: string | null; address: Record<string, unknown> | null;
  arrival?: { destination_available: boolean; ready: boolean; distance_meters?: number };
  position: CourierPosition | null; promotion_id: string | null;
  offered_user_id?: string | null; offer_expires_at?: string | null;
  details?: {
    pickup: Record<string, unknown>; notes: string | null; total_cents: number;
    payment_method: string; payment_status: string | null; change_for_cents: number | null;
    items: { name: string; quantity: number; variant: string | null; notes: string | null; addons: { name: string; quantity: number }[] }[];
  } | null;
  collection: { payment_id: string; amount_cents: number; change_for_cents: number | null; status: string } | null;
};
export type CourierSchedule = { id: string; user_id: string; day: string; start_time: string; end_time: string };
export type CourierPromotion = { id: string; title: string; terms: string; bonus_cents: number; starts_at: string; ends_at: string };
export type CourierMember = { dispatch_enabled?: boolean; user_id: string; full_name: string | null; active: boolean; stale: boolean; last_seen_at: string | null };
export type CourierDashboard = {
  restaurant_id: string; timezone: string; is_staff: boolean; is_manager: boolean; user_id: string; history_limit: number;
  base_cents: number | null; active: boolean; stale: boolean; last_seen_at: string | null;
  assignments: CourierAssignment[]; offers: CourierAssignment[]; members: CourierMember[];
  schedules: CourierSchedule[]; promotions: CourierPromotion[];
  metrics: { pickups: number; delivered: number; active_minutes: number; planned_minutes: number; attended_minutes: number };
  earnings: { pending_cents: number; available_cents: number; withdrawal_enabled: false };
  profile: { full_name: string | null; phone: string | null; pix_key: string | null };
};
export type CourierCommand =
  | { action: "complete"; payload: { order_id: string; code: string } }
  | { action: "availability"; payload: { active: boolean } }
  | { action: "heartbeat"; payload: Record<string, never> }
  | { action: "schedule"; payload: { id?: string; day: string; start_time: string; end_time: string } }
  | { action: "delete_schedule"; payload: { id: string } }
  | { action: "accept" | "decline" | "pickup" | "approve" | "offer"; payload: { order_id: string; promotion_id?: string } }
  | { action: "position"; payload: { order_id: string; latitude: number; longitude: number; accuracy: number } }
  | { action: "stop_tracking"; payload: { order_id: string } }
  | { action: "eligibility"; payload: { user_id: string; enabled: boolean } }
  | { action: "configure"; payload: { base_cents: number } }
  | { action: "promotion"; payload: { title: string; terms: string; bonus_cents: number; starts_at: string; ends_at: string } }
  | { action: "profile"; payload: { full_name?: string | null; phone?: string | null; pix_key: string | null } }
  | { action: "withdraw"; payload: Record<string, never> };
export type CourierTracking = { order_id: string; status: string; position: CourierPosition | null; courier?: { name: string | null; phone: string | null } | null; arrival?: { destination_available: boolean; ready: boolean; distance_meters?: number } | null };

export function courierAddressText(address: Record<string, unknown> | null | undefined): string {
  if (!address) return "Endereço não informado";
  return ["street", "number", "complement", "neighborhood", "city", "state", "cep"]
    .map((key) => address[key]).filter((value) => typeof value === "string" || typeof value === "number").join(", ") || "Endereço não informado";
}
