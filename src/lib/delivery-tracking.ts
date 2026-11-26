import type { PublicOrder } from "@/server/queries/public-menu";
export type DeliveryPoint = { latitude: number; longitude: number };
export function deliveryDestination(address: unknown): DeliveryPoint | null {
  if (!address || typeof address!=="object") return null;
  const {latitude,longitude}=address as Record<string,unknown>;
  return typeof latitude==="number" && Number.isFinite(latitude) && Math.abs(latitude)<=90 && typeof longitude==="number" && Number.isFinite(longitude) && Math.abs(longitude)<=180 ? {latitude,longitude} : null;
}
export function deliveryStage(status: PublicOrder["status"]): number {
  return status==="CANCELLED" ? -1 : status==="DELIVERED" ? 3 : status==="OUT_FOR_DELIVERY" ? 2 : ["PREPARING","READY"].includes(status) ? 1 : 0;
}
