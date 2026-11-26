"use server";

import { revalidatePath } from "next/cache";
import { parseMenzuError } from "@/lib/order-errors";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import {
  addonGroupSchema,
  ASSETS_BUCKET,
  categorySchema,
  MENU_ROLES,
  menuSchema,
  productImagePath,
  productSchema,
  type AddonGroupInput,
  type CategoryInput,
  type MenuInput,
  type ProductInput,
} from "@/lib/schemas/menu";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMemberOf } from "@/server/auth";

export type MenuActionResult = { ok: true; id?: string } | { ok: false; error?: string; fieldErrors?: FieldErrors };

const NOT_FOUND = "Item não encontrado ou sem permissão.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every mutation runs as the signed-in user: RLS (OWNER/MANAGER of the row's restaurant) is the authority. */
async function context(rid: string) {
  const member = await requireMemberOf(rid, MENU_ROLES);
  if (!member.ok) return member;
  const supabase = await createSupabaseServerClient();
  return { ...member, supabase };
}

function fail(error: unknown): MenuActionResult {
  const { code, message } = parseMenzuError(error);
  // Tenant-trigger details are internal (English); show a generic pt-BR message instead.
  if (code === "TENANT_MISMATCH" || code === "TENANT_IMMUTABLE") return { ok: false, error: "Dados inválidos." };
  return { ok: false, error: message };
}

function refresh(slug: string) {
  revalidatePath("/painel/cardapio", "layout");
  revalidatePath("/painel/complementos");
  revalidatePath(`/cardapio/${slug}`, "layout");
}

function validId(id: unknown): id is string {
  return typeof id === "string" && UUID.test(id);
}

/** Next `position` after the highest one returned by `query` (already filtered, ordered desc, limit 1). */
async function nextPosition(query: PromiseLike<{ data: { position: number }[] | null }>) {
  const { data } = await query;
  return (data?.[0]?.position ?? -1) + 1;
}

// ---------------------------------------------------------------- menus

export async function createMenuAction(rid: string, input: MenuInput): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  const parsed = menuSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const position = await nextPosition(
    supabase.from("menus").select("position").eq("restaurant_id", restaurantId).order("position", { ascending: false }).limit(1),
  );
  const { data, error } = await supabase
    .from("menus")
    .insert({ ...parsed.data, restaurant_id: restaurantId, position })
    .select("id")
    .single();
  if (error || !data) return fail(error);
  refresh(restaurant.slug);
  return { ok: true, id: data.id };
}

export async function updateMenuAction(rid: string, id: string, input: MenuInput): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (!validId(id)) return { ok: false, error: NOT_FOUND };
  const parsed = menuSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { data, error } = await supabase
    .from("menus")
    .update(parsed.data)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  refresh(restaurant.slug);
  return { ok: true, id };
}

export async function deleteMenuAction(rid: string, id: string): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (!validId(id)) return { ok: false, error: NOT_FOUND };
  const { count } = await supabase
    .from("menus")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if ((count ?? 0) <= 1) return { ok: false, error: "O restaurante precisa de pelo menos um cardápio." };
  // Images of the products that the cascade (menu → categories → products) is about to delete.
  const { data: products } = await supabase
    .from("products")
    .select("image_url, categories!inner(menu_id)")
    .eq("restaurant_id", restaurantId)
    .eq("categories.menu_id", id)
    .not("image_url", "is", null);
  const { data, error } = await supabase.from("menus").delete().eq("id", id).eq("restaurant_id", restaurantId).select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  await removeImages(
    supabase,
    restaurantId,
    (products ?? []).map((p) => p.image_url),
  );
  refresh(restaurant.slug);
  return { ok: true };
}

// ---------------------------------------------------------------- categories

export async function createCategoryAction(rid: string, menuId: string, input: CategoryInput): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (!validId(menuId)) return { ok: false, error: "Cardápio inválido." };
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { data: menu, error: lookupError } = await supabase.from("menus").select("id")
    .eq("restaurant_id", restaurantId).eq("id", menuId).maybeSingle();
  if (lookupError || !menu) return { ok: false, error: NOT_FOUND };
  const position = await nextPosition(
    supabase.from("categories").select("position").eq("restaurant_id", restaurantId).eq("menu_id", menuId).order("position", { ascending: false }).limit(1),
  );
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...parsed.data, menu_id: menuId, restaurant_id: restaurantId, position })
    .select("id")
    .single();
  if (error || !data) return fail(error);
  refresh(restaurant.slug);
  return { ok: true, id: data.id };
}

export async function updateCategoryAction(rid: string, id: string, input: CategoryInput): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (!validId(id)) return { ok: false, error: NOT_FOUND };
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { data, error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  refresh(restaurant.slug);
  return { ok: true, id };
}

export async function setCategoryActiveAction(rid: string, id: string, isActive: boolean): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (!validId(id)) return { ok: false, error: NOT_FOUND };
  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: Boolean(isActive) })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  refresh(restaurant.slug);
  return { ok: true, id };
}

/** Deletes a category and (FK cascade) its products; their images are removed from Storage best-effort. */
export async function deleteCategoryAction(rid: string, id: string): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (!validId(id)) return { ok: false, error: NOT_FOUND };
  const { data: products } = await supabase
    .from("products")
    .select("image_url")
    .eq("category_id", id)
    .eq("restaurant_id", restaurantId);
  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  await removeImages(
    supabase,
    restaurantId,
    (products ?? []).map((p) => p.image_url),
  );
  refresh(restaurant.slug);
  return { ok: true };
}

// ---------------------------------------------------------------- ordering

const REORDERABLE = ["menus", "categories", "products", "product_variants", "addon_options"] as const;
type Reorderable = (typeof REORDERABLE)[number];

/** Persists a drag-and-drop order through the `reorder` RPC (single tenant, OWNER/MANAGER, whitelisted tables). */
export async function reorderAction(rid: string, table: Reorderable, ids: string[]): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (!REORDERABLE.includes(table) || !Array.isArray(ids) || ids.length > 1000 || new Set(ids).size !== ids.length || !ids.every(validId)) {
    return { ok: false, error: "Lista inválida." };
  }
  if (ids.length === 0) return { ok: true };
  const { count, error: lookupError } = await supabase.from(table).select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId).in("id", ids);
  if (lookupError || count !== ids.length) return { ok: false, error: NOT_FOUND };
  const { error } = await supabase.rpc("reorder", { p_table: table, p_ids: ids });
  if (error) return fail(error);
  refresh(restaurant.slug);
  return { ok: true };
}

// ---------------------------------------------------------------- products

export async function setProductAvailabilityAction(rid: string, id: string, isAvailable: boolean): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (!validId(id)) return { ok: false, error: NOT_FOUND };
  const { data, error } = await supabase
    .from("products")
    .update({ is_available: Boolean(isAvailable) })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  refresh(restaurant.slug);
  return { ok: true, id };
}

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function removeImages(supabase: Client, restaurantId: string, urls: (string | null)[]) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const paths = urls.map((u) => productImagePath(u, base, restaurantId)).filter((p): p is string => Boolean(p));
  if (paths.length === 0) return;
  // Best-effort: a leftover object is harmless, a failed save is not.
  await supabase.storage.from(ASSETS_BUCKET).remove(paths);
}

/**
 * Creates (`id` null) or updates a product with its variants and linked addon groups.
 * Variants keep their ids (order history references them); removed ones are deleted.
 */
export async function saveProductAction(rid: string, id: string | null, input: ProductInput): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (id !== null && !validId(id)) return { ok: false, error: NOT_FOUND };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { variants, addon_group_ids, ...product } = parsed.data;

  let previousImage: string | null = null;
  if (id) {
    const { data: current } = await supabase
      .from("products")
      .select("image_url")
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (!current) return { ok: false, error: NOT_FOUND };
    previousImage = current.image_url;
  }

  // Only accept an unchanged image or one uploaded to this restaurant's product folder.
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (
    product.image_url &&
    product.image_url !== previousImage &&
    !productImagePath(product.image_url, base, restaurantId)
  ) {
    return { ok: false, fieldErrors: { image_url: "Envie a imagem pelo formulário." } };
  }

  // The category must be one of ours (RLS hides others; the tenant trigger would also reject it).
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", product.category_id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (!category) return { ok: false, fieldErrors: { category_id: "Escolha uma categoria." } };

  // One transaction (save_product RPC, security invoker → RLS applies): product, variants and links.
  const { data: productId, error } = await supabase.rpc("save_product", {
    p: { ...product, id, restaurant_id: restaurantId, variants, addon_group_ids },
  });
  if (error || !productId) return fail(error);

  if (previousImage && previousImage !== product.image_url) {
    await removeImages(supabase, restaurantId, [previousImage]);
  }
  refresh(restaurant.slug);
  return { ok: true, id: productId };
}

export async function deleteProductAction(rid: string, id: string): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (!validId(id)) return { ok: false, error: NOT_FOUND };
  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("image_url");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  await removeImages(supabase, restaurantId, [data[0].image_url]);
  refresh(restaurant.slug);
  return { ok: true };
}

/** Removes an image uploaded in the editor but never saved (cancel / replaced before saving). */
export async function discardUploadedImageAction(rid: string, url: string): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId } = ctx;
  if (typeof url !== "string") return { ok: false };
  // Never delete an image a product still points to.
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("image_url", url);
  if ((count ?? 0) > 0) return { ok: true };
  await removeImages(supabase, restaurantId, [url]);
  return { ok: true };
}

// ---------------------------------------------------------------- addon groups

export async function saveAddonGroupAction(rid: string, id: string | null, input: AddonGroupInput): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (id !== null && !validId(id)) return { ok: false, error: NOT_FOUND };
  const parsed = addonGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { options, ...group } = parsed.data;

  // One transaction (save_addon_group RPC, security invoker → RLS applies): group and options.
  const { data: groupId, error } = await supabase.rpc("save_addon_group", {
    p: { ...group, id, restaurant_id: restaurantId, options },
  });
  if (error || !groupId) return fail(error);

  refresh(restaurant.slug);
  return { ok: true, id: groupId };
}

export async function deleteAddonGroupAction(rid: string, id: string): Promise<MenuActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (!validId(id)) return { ok: false, error: NOT_FOUND };
  const { data, error } = await supabase
    .from("addon_groups")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  refresh(restaurant.slug);
  return { ok: true };
}
