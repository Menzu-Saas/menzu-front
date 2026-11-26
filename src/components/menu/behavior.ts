import type { PublicCategory, PublicMenuTab, PublicProduct } from "@/server/queries/public-menu";
import type { NewCartLine } from "@/stores/cart";

export const foldMenuText = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function searchMenu(menus: PublicMenuTab[], query: string): PublicCategory[] {
  const terms = foldMenuText(query.trim()).split(/\s+/).filter(Boolean);
  return menus.flatMap((menu) => menu.categories.map((category) => ({
    ...category,
    products: category.products.filter((product) => {
      const text = foldMenuText([menu.name, category.name, product.name, product.description, ...product.variants.map((v) => v.name), ...product.addonGroups.flatMap((g) => [g.name, ...g.options.map((o) => o.name)])].join(" "));
      return terms.every((term) => text.includes(term));
    }),
  }))).filter((category) => category.products.length > 0);
}

export function quickCartLine(product: PublicProduct): NewCartLine | null {
  if (!product.available || product.variants.length || product.addonGroups.length) return null;
  return { productId: product.id, variantId: null, name: product.name, variantName: null, imageUrl: product.imageUrl, quantity: 1, notes: "", addons: [], unitPriceCents: product.promoPriceCents ?? product.priceCents };
}

export type MenuPosition = { query: string; menuId: string; category: string | null; y: number };
export const menuPositionKey = (slug: string) => `menzu-menu-position:${slug}`;
export const menuFavoritesKey = (slug: string) => `menzu-menu-favorites:${slug}`;

export function parseMenuPosition(raw: string | null): MenuPosition | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || typeof value.query !== "string" || value.query.length > 100 || typeof value.menuId !== "string" || value.menuId.length > 100 || !(value.category === null || typeof value.category === "string") || !Number.isFinite(value.y) || value.y < 0) return null;
    return { query: value.query, menuId: value.menuId, category: value.category, y: Math.min(value.y, 1_000_000) };
  } catch { return null; }
}

export function parseMenuFavorites(raw: string | null): string[] {
  try {
    const value = JSON.parse(raw ?? "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 100))].slice(0, 500) : [];
  } catch { return []; }
}
