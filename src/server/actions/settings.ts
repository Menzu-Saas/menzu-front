"use server";

import { revalidatePath } from "next/cache";
import { BETA_UNAVAILABLE } from "@/lib/beta-unavailable";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MANAGEMENT_ROLES } from "@/lib/roles";
import { parseMenzuError } from "@/lib/order-errors";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import {
  addressSchema,
  hoursSchema,
  operationSchema,
  paymentsSchema,
  profileSchema,
  SLUG_PATTERN,
  type AddressInput,
  type HoursInput,
  type OperationInput,
  type PaymentsInput,
  type ProfileInput,
} from "@/lib/schemas/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TableUpdate } from "@/lib/types";
import { CURRENT_RESTAURANT_COOKIE, requireMemberOf } from "@/server/auth";

export type SettingsResult = { ok: true } | { ok: false; error?: string; fieldErrors?: FieldErrors };

const ASSETS_BUCKET = "restaurant-assets";
const SAVE_FAILED = "Não foi possível salvar. Tente novamente.";

function invalid(error: z.ZodError): SettingsResult {
  return { ok: false, fieldErrors: fieldErrors(error) };
}

/** Updates the current restaurant (RLS: OWNER/MANAGER); zero rows updated means no permission. */
async function updateRestaurant(restaurantId: string, patch: TableUpdate<"restaurants">): Promise<SettingsResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("restaurants").update(patch).eq("id", restaurantId).select("id");
  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { slug: "Este endereço já está em uso." } };
    return { ok: false, error: SAVE_FAILED };
  }
  if (!data?.length) return { ok: false, error: "Você não tem permissão para esta ação." };
  revalidatePath("/painel", "layout");
  return { ok: true };
}

/** Whether `slug` is free (ignoring the current restaurant). */
export async function checkSlugAction(rid: string, slug: string): Promise<{ valid: boolean; available: boolean }> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  // Saving re-checks both the restaurant and the slug, and reports the real error there.
  if (!member.ok) return { valid: true, available: true };
  const { restaurantId } = member;
  const value = String(slug ?? "").trim().toLowerCase();
  if (!SLUG_PATTERN.test(value)) return { valid: false, available: false };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("is_slug_available", { p_slug: value, p_restaurant_id: restaurantId });
  return { valid: true, available: data === true };
}

/** Perfil da loja: name, description, contacts, slug and accent colour. */
export async function updateProfileAction(rid: string, input: ProfileInput): Promise<SettingsResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { restaurantId } = member;
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { data: available } = await supabase.rpc("is_slug_available", {
    p_slug: parsed.data.slug,
    p_restaurant_id: restaurantId,
  });
  if (available === false) return { ok: false, fieldErrors: { slug: "Este endereço já está em uso." } };
  return updateRestaurant(restaurantId, parsed.data);
}

export async function updateAddressAction(rid: string, input: AddressInput): Promise<SettingsResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { restaurantId } = member;
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return updateRestaurant(restaurantId, parsed.data);
}

export async function updateOperationAction(rid: string, input: OperationInput): Promise<SettingsResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { restaurantId } = member;
  const parsed = operationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return updateRestaurant(restaurantId, parsed.data);
}

export async function updatePaymentsAction(rid: string, input: PaymentsInput): Promise<SettingsResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const parsed = paymentsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.payment_methods.some((method) => method !== "CASH")) return {ok:false,error:BETA_UNAVAILABLE};
  return updateRestaurant(member.restaurantId, parsed.data);
}

/** Replaces the weekly schedule atomically (`set_opening_hours`; unchanged rows keep their id). */
export async function updateHoursAction(rid: string, input: HoursInput): Promise<SettingsResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { restaurantId } = member;
  const parsed = hoursSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_opening_hours", {
    p_restaurant_id: restaurantId,
    p_hours: parsed.data.hours,
  });
  if (error) return { ok: false, error: parseMenzuError(error).message };
  revalidatePath("/painel", "layout");
  return { ok: true };
}

const statusSchema = z.enum(["OPEN", "PAUSED", "CLOSED"]);

/** Aberta / Pausada / Fechada (set_restaurant_status re-checks OWNER/MANAGER). */
export async function setStatusAction(rid: string, status: string): Promise<SettingsResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { restaurantId } = member;
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Status inválido." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_restaurant_status", { p_restaurant_id: restaurantId, p_status: parsed.data });
  if (error) return { ok: false, error: parseMenzuError(error).message };
  revalidatePath("/painel", "layout");
  return { ok: true };
}

const imageKind = z.enum(["logo", "banner"]);

/**
 * Stores the public URL of an image the browser uploaded to `restaurant-assets/{restaurant_id}/…`
 * (Storage RLS: OWNER/MANAGER of that folder). The path must live in the current restaurant's folder;
 * `null` removes the image. The previous file is deleted best-effort.
 */
export async function setRestaurantImageAction(rid: string, kind: string, path: string | null): Promise<SettingsResult & { url?: string | null }> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { restaurantId } = member;
  const parsedKind = imageKind.safeParse(kind);
  if (!parsedKind.success) return { ok: false, error: "Imagem inválida." };
  const pattern = new RegExp(`^${restaurantId}/(logo|banner)-[a-z0-9-]{8,64}\\.(png|jpe?g|webp)$`);
  if (path !== null && !pattern.test(path)) return { ok: false, error: "Imagem inválida." };

  const supabase = await createSupabaseServerClient();
  const column = parsedKind.data === "logo" ? "logo_url" : "banner_url";
  const { data: before } = await supabase.from("restaurants").select("logo_url, banner_url").eq("id", restaurantId).maybeSingle();
  const url = path ? supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;
  const result = await updateRestaurant(restaurantId, { [column]: url });
  if (!result.ok) return result;

  const previous = before?.[column];
  const marker = `/object/public/${ASSETS_BUCKET}/`;
  const oldPath = previous?.includes(marker) ? decodeURIComponent(previous.split(marker)[1] ?? "") : null;
  if (oldPath && oldPath.startsWith(`${restaurantId}/`) && oldPath !== path) {
    await supabase.storage.from(ASSETS_BUCKET).remove([oldPath]);
  }
  return { ok: true, url };
}

/** Zona de perigo: OWNER only (also enforced by delete_restaurant). Requires the slug typed back. */
export async function deleteRestaurantAction(rid: string, confirmSlug: string): Promise<SettingsResult> {
  const member = await requireMemberOf(rid, ["OWNER"]);
  if (!member.ok) return member;
  const { restaurantId, restaurant } = member;
  if (String(confirmSlug ?? "").trim().toLowerCase() !== restaurant.slug.toLowerCase()) {
    return { ok: false, fieldErrors: { confirm: "Digite o endereço exatamente como mostrado." } };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_restaurant", { p_restaurant_id: restaurantId });
  if (error) return { ok: false, error: parseMenzuError(error).message };
  (await cookies()).delete(CURRENT_RESTAURANT_COOKIE);
  revalidatePath("/", "layout");
  redirect("/painel");
}
