import type { DeliveryZoneType } from "@/lib/types";

export interface ZoneRow {
  id: string;
  name: string;
  type: DeliveryZoneType;
  neighborhoods: string[];
  city?: string | null;
  state?: string | null;
  cep_start: string | null;
  cep_end: string | null;
  fee_cents: number;
  min_order_cents: number | null;
  est_minutes: number | null;
  is_active: boolean;
  position: number;
}

export const ZONE_TYPE_BADGE: Record<DeliveryZoneType, string> = {
  NEIGHBORHOOD: "BAIRRO",
  CEP_RANGE: "CEP",
  DISTANCE: "DISTÂNCIA",
};
