import { z } from "zod";
import type { PublicProduct } from "@/server/queries/public-menu";

export const discoveryAddressSchema = z.object({
  cep: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().length(8)),
  neighborhood: z.string().trim().min(1).max(80), city: z.string().trim().min(1).max(120),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/), street: z.string().trim().max(200).optional(),
});
export type DiscoveryAddress = z.infer<typeof discoveryAddressSchema>;
export const discoveryFiltersSchema = z.object({
  q: z.string().trim().max(100).default(""), category: z.string().uuid().optional(),
  minPrice: z.number().int().min(0).max(100000000).optional(), maxPrice: z.number().int().min(0).max(100000000).optional(),
  offer: z.boolean().default(false), freeDelivery: z.boolean().default(false), vr: z.boolean().default(false), openNow: z.boolean().default(false),
  sort: z.enum(["relevance", "price_asc", "price_desc", "discount", "fast", "bestsellers"]).default("relevance"),
});
export type DiscoveryFilters = z.infer<typeof discoveryFiltersSchema>;
export type MarketplaceRestaurant = {
  id: string; slug: string; name: string; description: string | null; logoUrl: string | null; bannerUrl: string | null;
  openNow: boolean; canSchedule: boolean; status: "OPEN" | "CLOSED" | "PAUSED"; feeCents: number; minOrderCents: number;
  etaMinutes: number | null; acceptsVr: boolean;
};
export type FoodCategory = { id: string; name: string; imageUrl: string | null };
export type MarketplaceProduct = PublicProduct & {
  restaurant: MarketplaceRestaurant; foodCategoryId: string | null; foodCategoryName: string | null;
  displayCents: number; fromPrefix: boolean; discountPercent: number; sold: number; popular: number;
};
export type MarketplaceCampaign = {
  id: string; title: string; description: string | null; imageUrl: string | null; startsAt: string; endsAt: string;
  target: { kind: "product" | "restaurant" | "category" | "offers"; id: string | null; slug?: string };
};
export type RecentPurchase = { items?: { name: string; quantity: number; imageUrl: string | null }[]; id: string; number: number; createdAt: string; status: string; totalCents: number; restaurant: MarketplaceRestaurant };
export type DiscoveryResult = {
  restaurants: MarketplaceRestaurant[]; restaurantTotal: number; products: MarketplaceProduct[]; total: number; page: number; pageSize: number;
  categories: FoodCategory[]; slides: MarketplaceCampaign[]; campaigns: MarketplaceCampaign[];
  offers: MarketplaceProduct[]; fast: MarketplaceProduct[]; recent: RecentPurchase[]; signedIn: boolean;
};
export const discoveryRequestSchema = z.object({
  address: discoveryAddressSchema, filters: discoveryFiltersSchema.default({ q: "", offer: false, freeDelivery: false, vr: false, openNow: false, sort: "relevance" }),
  page: z.number().int().min(1).max(10000).default(1), restaurantPage: z.number().int().min(1).max(10000).default(1),
});
