import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Database } from "@/lib/supabase/database.types";
import type { OpeningHourInput } from "@/lib/opening-hours";
import { validRestaurantColor } from "@/lib/restaurant-accent";
import { menuExperienceSettings, type PublicMenuExperience } from "@/lib/menu-experience";
import type { PaymentMethod, RestaurantStatus } from "@/lib/types";
import { getPaymentProvider, isDevelopmentPaymentsEnabled } from "@/server/payments";

/**
 * Public (anonymous) reads for the customer menu. Uses a cookie-less publishable-key client so a
 * logged-in staff member sees exactly what customers see (member RLS would also expose inactive rows).
 */
function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type PublicAddonOption = {
  id: string;
  name: string;
  priceCents: number;
  maxQuantity: number;
  available: boolean;
};

export type PublicAddonGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  options: PublicAddonOption[];
};

export type PublicVariant = { id: string; name: string; priceCents: number; available: boolean };

export type PublicProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  promoPriceCents: number | null;
  available: boolean;
  variants: PublicVariant[];
  addonGroups: PublicAddonGroup[];
};

export type PublicCategory = { id: string; name: string; description: string | null; products: PublicProduct[] };
export type PublicMenuTab = { id: string; name: string; categories: PublicCategory[] };

export type PublicRestaurant = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  /** Validated "#RRGGBB" accent chosen by the restaurant, or null (Menzu brand). */
  primaryColor: string | null;
  whatsapp: string | null;
  phone: string | null;
  addressLine: string | null;
  status: RestaurantStatus;
  minOrderCents: number;
  avgPrepMinutes: number;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  acceptsDineIn: boolean;
  acceptsScheduling: boolean;
  paymentMethods: PaymentMethod[];
  timezone: string;
  hours: OpeningHourInput[];
  /** Range of zone estimates ("40–50 min"), null without zones. */
  deliveryMinutes: { min: number; max: number } | null;
};

export type PublicMenu = { restaurant: PublicRestaurant; menus: PublicMenuTab[]; experience?: PublicMenuExperience };

async function fetchRestaurant(db: SupabaseClient<Database>, slug: string): Promise<PublicRestaurant | null> {
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/i.test(slug)) return null;
  const { data: r, error } = await db.from("public_restaurants").select("*").eq("slug", slug.toLowerCase()).maybeSingle();
  if (error) throw error;
  if (!r || !r.id) return null;

  const [hoursRes, zonesRes] = await Promise.all([
    db.from("opening_hours").select("weekday, opens_at, closes_at").eq("restaurant_id", r.id),
    db.from("delivery_zones").select("est_minutes").eq("restaurant_id", r.id).eq("is_active", true),
  ]);
  if (hoursRes.error) throw hoursRes.error;
  if (zonesRes.error) throw zonesRes.error;

  const estimates = (zonesRes.data ?? []).map((z) => z.est_minutes).filter((m): m is number => m != null);
  const addressLine = [r.address_street && `${r.address_street}${r.address_number ? `, ${r.address_number}` : ""}`, r.address_neighborhood]
    .filter(Boolean)
    .join(" · ");

  return {
    id: r.id,
    slug: String(r.slug),
    name: r.name ?? "",
    description: r.description,
    logoUrl: r.logo_url,
    bannerUrl: r.banner_url,
    primaryColor: validRestaurantColor(r.primary_color),
    whatsapp: r.whatsapp,
    phone: r.phone,
    addressLine: addressLine || null,
    status: (r.status ?? "CLOSED") as RestaurantStatus,
    minOrderCents: r.min_order_cents ?? 0,
    avgPrepMinutes: r.avg_prep_minutes ?? 30,
    acceptsDelivery: Boolean(r.accepts_delivery),
    acceptsPickup: Boolean(r.accepts_pickup),
    acceptsDineIn: Boolean(r.accepts_dine_in),
    acceptsScheduling: Boolean(r.accepts_scheduling),
    paymentMethods: (r.payment_methods ?? []) as PaymentMethod[],
    timezone: r.timezone || "America/Sao_Paulo",
    hours: hoursRes.data ?? [],
    deliveryMinutes: estimates.length ? { min: Math.min(...estimates), max: Math.max(...estimates) } : null,
  };
}

/** Restaurant header data only (cart, checkout, tracking). */
export const getPublicRestaurant = cache(async (slug: string) => fetchRestaurant(anonClient(), slug));

/** Restaurant + active menus → categories → active products with variants and addon groups. */
export const getPublicMenu = cache(async (slug: string): Promise<PublicMenu | null> => {
  const db = anonClient();
  const restaurant = await fetchRestaurant(db, slug);
  if (!restaurant) return null;
  const rid = restaurant.id;

  const [catalog, settings, sales] = await Promise.all([
    db.rpc("menzu_public_catalog", { p_restaurant_id: rid }),
    db.from("menu_experience_settings").select("section_order, enabled_sections, featured_product_ids").eq("restaurant_id", rid).maybeSingle(),
    db.rpc("public_menu_bestsellers", { p_restaurant_id: rid }),
  ]);
  if (catalog.error) throw catalog.error;
  if (settings.error) throw settings.error;
  if (sales.error) throw sales.error;
  const { menus, categories, products, variants, links, groups, options } = catalog.data;

  const optionsByGroup = new Map<string, PublicAddonOption[]>();
  for (const o of options) {
    const list = optionsByGroup.get(o.addon_group_id) ?? [];
    list.push({ id: o.id, name: o.name, priceCents: o.price_cents, maxQuantity: o.max_quantity, available: o.is_available });
    optionsByGroup.set(o.addon_group_id, list);
  }
  const groupById = new Map<string, PublicAddonGroup>();
  for (const g of groups) {
    groupById.set(g.id, {
      id: g.id,
      name: g.name,
      minSelect: g.min_select,
      maxSelect: g.max_select,
      required: g.is_required || g.min_select > 0,
      options: optionsByGroup.get(g.id) ?? [],
    });
  }
  const groupsByProduct = new Map<string, PublicAddonGroup[]>();
  for (const l of links) {
    const g = groupById.get(l.addon_group_id);
    if (!g) continue;
    const list = groupsByProduct.get(l.product_id) ?? [];
    list.push(g);
    groupsByProduct.set(l.product_id, list);
  }
  const variantsByProduct = new Map<string, PublicVariant[]>();
  for (const v of variants) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push({ id: v.id, name: v.name, priceCents: v.price_cents, available: v.is_available });
    variantsByProduct.set(v.product_id, list);
  }
  const productsByCategory = new Map<string, PublicProduct[]>();
  for (const p of products) {
    const productVariants = variantsByProduct.get(p.id) ?? [];
    const hasVariants = productVariants.length > 0;
    const list = productsByCategory.get(p.category_id) ?? [];
    list.push({
      id: p.id,
      categoryId: p.category_id,
      name: p.name,
      description: p.description,
      imageUrl: p.image_url,
      priceCents: p.price_cents,
      promoPriceCents: !hasVariants && p.promo_price_cents != null && p.promo_price_cents < p.price_cents ? p.promo_price_cents : null,
      available: p.available && (!hasVariants || productVariants.some((v) => v.available)),
      variants: productVariants,
      addonGroups: groupsByProduct.get(p.id) ?? [],
    });
    productsByCategory.set(p.category_id, list);
  }

  const tabs: PublicMenuTab[] = menus
    .map((m) => ({
      id: m.id,
      name: m.name,
      categories: categories
        .filter((c) => c.menu_id === m.id)
        .map((c) => ({ id: c.id, name: c.name, description: c.description, products: productsByCategory.get(c.id) ?? [] }))
        .filter((c) => c.products.length > 0),
    }))
    .filter((m) => m.categories.length > 0);

  const visibleIds = new Set(tabs.flatMap((menu) => menu.categories.flatMap((category) => category.products.map((product) => product.id))));
  const config = menuExperienceSettings(settings.data);
  return { restaurant, menus: tabs, experience: {
    ...config,
    featuredProductIds: config.featuredProductIds.filter((id) => visibleIds.has(id)),
    bestsellers: (sales.data ?? []).filter((sale) => visibleIds.has(sale.product_id)).map((sale) => ({ productId: sale.product_id, quantity: sale.quantity })),
  } };
});

/** Whether `table` exists for the restaurant (QR code `?table=`). */
export async function publicTableExists(restaurantId: string, table: number): Promise<boolean> {
  if (!Number.isInteger(table) || table < 1 || table > 9999) return false;
  const { data, error } = await anonClient().rpc("menzu_public_table_exists", {
    p_restaurant_id: restaurantId,
    p_table_number: table,
  });
  return !error && data === true;
}

export type PublicPaymentMode = {
  /** Provider that will charge online methods. */
  provider: "mercadopago" | "asaas" | "development";
  /** Online methods (PIX / CARD_ONLINE) can actually be charged in this deployment. */
  onlineAvailable: boolean;
  /**
   * The customer must type an e-mail to pay with PIX: Mercado Pago is on and no default payer e-mail
   * (`MERCADOPAGO_DEFAULT_PAYER_EMAIL`) is configured. Mirrors the rule in `placeOrder`.
   */
  emailRequiredForPix: boolean;
  /** O comprador precisa ter CPF para pagar online (Pix ou cartão, via Asaas). Inativo até o online ser liberado. */
  cpfRequiredForOnline?: boolean;
};

/**
 * Provider mode exposed to the checkout. Never returns secrets. Online methods are offered only when
 * this deployment can charge them (Mercado Pago + service-role key to register the charge, or local
 * development payments) AND the database accepts them (`online_payments_available()`: the platform
 * flags online_payments_enabled / allow_development_payments). Any lookup error hides them.
 */
export async function getPublicPaymentMode(): Promise<PublicPaymentMode> {
  const id = getPaymentProvider().id;
  const deployable =
    id === "development" ? isDevelopmentPaymentsEnabled() : Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  let platformAllows = false;
  if (deployable) {
    const { data, error } = await anonClient().rpc("online_payments_available");
    platformAllows = !error && data === true;
  }
  return {
    provider: id,
    onlineAvailable: deployable && platformAllows,
    emailRequiredForPix: id === "mercadopago" && !process.env.MERCADOPAGO_DEFAULT_PAYER_EMAIL?.trim(),
    // Asaas creates the charge on a customer with CPF/CNPJ, for PIX and for the hosted card page.
    cpfRequiredForOnline: id === "asaas",
  };
}

export type PublicOrder = {
  delivery_confirmation_code?: string | null;
  delivery_estimate?: { earliest_at: string; latest_at: string; basis: "restaurant" } | null;
  id: string;
  number: number;
  type: "DELIVERY" | "PICKUP" | "DINE_IN";
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
  table_number: number | null;
  customer_name: string;
  address: Record<string, string> | null;
  scheduled_for: string | null;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  subtotal_cents: number;
  discount_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  payment_method: PaymentMethod;
  change_for_cents: number | null;
  items: {
    product_name: string;
    variant_name: string | null;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
    notes: string | null;
    addons: { group_name: string; option_name: string; quantity: number; unit_price_cents: number }[];
  }[];
  payment: {
    id: string;
    method: PaymentMethod;
    status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
    provider: string;
    pix_qr_code: string | null;
    pix_qr_base64: string | null;
    checkout_url: string | null;
    paid_at: string | null;
  } | null;
  restaurant: { name: string; slug: string; whatsapp: string | null; phone: string | null; logo_url: string | null };
};

/** get_public_order (token-authorised); null when the id/token pair is unknown. */
export async function getPublicOrder(id: string, token: string): Promise<PublicOrder | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !token || token.length > 200) return null;
  const { data, error } = await anonClient().rpc("get_public_order", { p_order_id: id, p_token: token });
  if (error || !data) return null;
  return data as unknown as PublicOrder;
}

export async function getRestaurantRating(id: string) {
  const { data } = await anonClient().rpc("restaurant_rating", { p_restaurant_id: id });
  return data?.[0] ?? null;
}

export async function saveOrderFeedback(args: Database["public"]["Functions"]["submit_order_feedback"]["Args"]) {
  return anonClient().rpc("submit_order_feedback", args);
}

export async function getOrderReviewState(id: string, token: string, confirm = false) {
  const { data } = await anonClient().rpc("guest_order_review_state", {
    p_order_id: id, p_token: token, p_confirm: confirm,
  });
  return data ?? "unavailable";
}
