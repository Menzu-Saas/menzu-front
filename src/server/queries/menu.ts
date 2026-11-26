import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductStatus } from "@/lib/types";

export interface AdminMenu {
  id: string;
  name: string;
  is_active: boolean;
}

export interface AdminCategory {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  position: number;
}

export interface AdminProductCard {
  id: string;
  category_id: string;
  name: string;
  image_url: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  is_available: boolean;
  stock_quantity: number | null;
  status: ProductStatus;
  /** Options available across the product's linked addon groups. */
  addons: number;
  /** Units sold (non-cancelled orders). */
  sales: number;
}

export interface AddonOptionRow {
  id: string;
  name: string;
  price_cents: number;
  max_quantity: number;
  is_available: boolean;
}

export interface AddonGroupRow {
  id: string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  options: AddonOptionRow[];
  /** Products linked to this group. */
  products: number;
}

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Failed to load ${what}: ${res.error.message}`);
  return res.data as T;
}

export async function listMenus(restaurantId: string): Promise<AdminMenu[]> {
  const supabase = await createSupabaseServerClient();
  return check(
    await supabase
      .from("menus")
      .select("id, name, is_active")
      .eq("restaurant_id", restaurantId)
      .order("position")
      .order("created_at"),
    "menus",
  );
}

export async function listCategories(restaurantId: string, menuId?: string): Promise<AdminCategory[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("categories")
    .select("id, menu_id, name, description, is_active, position")
    .eq("restaurant_id", restaurantId);
  if (menuId) q = q.eq("menu_id", menuId);
  return check(await q.order("position").order("created_at"), "categories");
}

/** Product cards of the given categories with addon-option and sales counts. */
export async function listProductCards(restaurantId: string, categoryIds: string[]): Promise<AdminProductCard[]> {
  if (categoryIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const products = check(
    await supabase
      .from("products")
      .select(
        "id, category_id, name, image_url, price_cents, promo_price_cents, is_available, stock_quantity, status, " +
          "product_addon_groups(addon_groups(addon_options(id, is_available)))",
      )
      .eq("restaurant_id", restaurantId)
      .in("category_id", categoryIds)
      .order("position")
      .order("created_at"),
    "products",
  ) as unknown as (Omit<AdminProductCard, "addons" | "sales"> & {
    product_addon_groups: { addon_groups: { addon_options: { id: string; is_available: boolean }[] } | null }[];
  })[];

  const sales = new Map<string, number>();
  if (products.length) {
    // Aggregated in Postgres (product_sales, security invoker): no row cap, RLS decides visibility.
    const rows = check(
      await supabase.rpc("product_sales", {
        p_restaurant_id: restaurantId,
        p_product_ids: products.map((p) => p.id),
      }),
      "sales",
    );
    for (const r of rows ?? []) sales.set(r.product_id, Number(r.units));
  }

  return products.map(({ product_addon_groups, ...p }) => ({
    ...p,
    addons: product_addon_groups.reduce(
      (n, link) => n + (link.addon_groups?.addon_options.filter((o) => o.is_available).length ?? 0),
      0,
    ),
    sales: sales.get(p.id) ?? 0,
  }));
}

export async function listAddonGroups(restaurantId: string): Promise<AddonGroupRow[]> {
  const supabase = await createSupabaseServerClient();
  const groups = check(
    await supabase
      .from("addon_groups")
      .select(
        "id, name, is_required, min_select, max_select, " +
          "addon_options(id, name, price_cents, max_quantity, is_available, position), product_addon_groups(product_id)",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at"),
    "addon groups",
  ) as unknown as (Omit<AddonGroupRow, "options" | "products"> & {
    addon_options: (AddonOptionRow & { position: number })[];
    product_addon_groups: { product_id: string }[];
  })[];
  return groups.map(({ addon_options, product_addon_groups, ...g }) => ({
    ...g,
    options: [...addon_options]
      .sort((a, b) => a.position - b.position)
      .map((o) => ({
        id: o.id,
        name: o.name,
        price_cents: o.price_cents,
        max_quantity: o.max_quantity,
        is_available: o.is_available,
      })),
    products: product_addon_groups.length,
  }));
}

export interface ProductEditorData {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  price_cents: number;
  promo_price_cents: number | null;
  is_available: boolean;
  stock_quantity: number | null;
  status: ProductStatus;
  image_url: string | null;
  variants: { id: string; name: string; price_cents: number; is_available: boolean }[];
  addon_group_ids: string[];
}

export async function getProductForEditor(restaurantId: string, id: string): Promise<ProductEditorData | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, description, category_id, price_cents, promo_price_cents, is_available, stock_quantity, status, image_url, " +
        "product_variants(id, name, price_cents, is_available, position), product_addon_groups(addon_group_id, position)",
    )
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load product: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as Omit<ProductEditorData, "variants" | "addon_group_ids"> & {
    product_variants: (ProductEditorData["variants"][number] & { position: number })[];
    product_addon_groups: { addon_group_id: string; position: number }[];
  };
  const { product_variants, product_addon_groups, ...product } = row;
  return {
    ...product,
    variants: [...product_variants]
      .sort((a, b) => a.position - b.position)
      .map((v) => ({ id: v.id, name: v.name, price_cents: v.price_cents, is_available: v.is_available })),
    addon_group_ids: [...product_addon_groups].sort((a, b) => a.position - b.position).map((l) => l.addon_group_id),
  };
}
