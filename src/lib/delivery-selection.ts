import type { DiscoveryAddress } from "./marketplace";

const key = "menzu-delivery-selection";
export function currentDeliverySelection(): string {
  try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
}
export function markDeliverySelection(address: DiscoveryAddress): void {
  try {
    localStorage.setItem(key, JSON.stringify([address.cep, address.neighborhood, address.city, address.state, address.street ?? ""]));
  } catch { /* Address changes must work when storage is blocked. */ }
}
