import type { DiscoveryAddress, MarketplaceProduct } from "@/lib/marketplace";
import type { PublicProduct } from "@/server/queries/public-menu";
import { markDeliverySelection } from "@/lib/delivery-selection";
import { loadCustomer, saveCustomer } from "@/components/checkout/customer-storage";

export function requiresChoices(product: PublicProduct): boolean {
  return product.variants.length > 0 || product.addonGroups.some((group) => group.required || group.minSelect > 0);
}

export function canAddNow(product: MarketplaceProduct): boolean {
  return product.available && product.restaurant.openNow && product.restaurant.status === "OPEN";
}

export function rememberAddress(address: DiscoveryAddress) {
  const customer = loadCustomer() ?? { name: "", phone: "", email: "", address: null };
  // Number/complement from a different destination must not carry over to the new one.
  const same = customer.address && ["cep", "street", "neighborhood", "city", "state"].every(
    (key) => (customer.address?.[key as keyof DiscoveryAddress] ?? "") === (address[key as keyof DiscoveryAddress] ?? ""),
  );
  saveCustomer({ ...customer, address: { ...(same ? customer.address : {}), ...address } });
  markDeliverySelection(address);
}

export const defaultFilters = { q: "", offer: false, freeDelivery: false, vr: false, openNow: false, sort: "relevance" } as const;
