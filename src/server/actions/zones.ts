"use server";

import { revalidatePath } from "next/cache";
import { parseMenzuError } from "@/lib/order-errors";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import { ZONE_ROLES, zoneSchema, type ZoneInput } from "@/lib/schemas/zone";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMemberOf } from "@/server/auth";

export type ZoneActionResult = { ok: true; id?: string } | { ok: false; error?: string; fieldErrors?: FieldErrors };

const NOT_FOUND = "Zona não encontrada ou sem permissão.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Runs as the signed-in user; writes are always scoped to the server-side current restaurant (RLS re-checks the role). */
async function context(rid: string) {
  const member = await requireMemberOf(rid, ZONE_ROLES);
  if (!member.ok) return member;
  const supabase = await createSupabaseServerClient();
  return { ...member, supabase };
}

function fail(error: unknown): ZoneActionResult {
  return { ok: false, error: parseMenzuError(error).message };
}

function refresh(slug: string) {
  revalidatePath("/painel/entrega");
  revalidatePath(`/cardapio/${slug}`, "layout");
}

export async function createZoneAction(rid: string, input: ZoneInput): Promise<ZoneActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { data: last } = await supabase
    .from("delivery_zones")
    .select("position")
    .eq("restaurant_id", restaurantId)
    .order("position", { ascending: false })
    .limit(1);
  const position = (last?.[0]?.position ?? -1) + 1;
  const { data, error } = await supabase
    .from("delivery_zones")
    .insert({ ...parsed.data, restaurant_id: restaurantId, position })
    .select("id")
    .single();
  if (error || !data) return fail(error);
  refresh(restaurant.slug);
  return { ok: true, id: data.id };
}

export async function updateZoneAction(rid: string, id: string, input: ZoneInput): Promise<ZoneActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, error: NOT_FOUND };
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { data, error } = await supabase
    .from("delivery_zones")
    .update(parsed.data)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  refresh(restaurant.slug);
  return { ok: true, id };
}

export async function setZoneActiveAction(rid: string, id: string, active: boolean): Promise<ZoneActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (typeof id !== "string" || !UUID.test(id) || typeof active !== "boolean") return { ok: false, error: NOT_FOUND };
  const { data, error } = await supabase
    .from("delivery_zones")
    .update({ is_active: active })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  refresh(restaurant.slug);
  return { ok: true, id };
}

/** Past orders keep their fee and address; their `delivery_zone_id` becomes null (FK on delete set null). */
export async function deleteZoneAction(rid: string, id: string): Promise<ZoneActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId, restaurant } = ctx;
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, error: NOT_FOUND };
  const { data, error } = await supabase
    .from("delivery_zones")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  refresh(restaurant.slug);
  return { ok: true, id };
}
