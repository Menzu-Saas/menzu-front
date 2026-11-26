"use server";

import { revalidatePath } from "next/cache";
import { parseMenzuError } from "@/lib/order-errors";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import { COUPON_ROLES, couponSchema, type CouponInput } from "@/lib/schemas/coupon";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMemberOf } from "@/server/auth";

export type CouponActionResult = { ok: true; id?: string } | { ok: false; error?: string; fieldErrors?: FieldErrors };

const NOT_FOUND = "Cupom não encontrado ou sem permissão.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Runs as the signed-in user; writes are always scoped to the server-side current restaurant (RLS re-checks the role). */
async function context(rid: string) {
  const member = await requireMemberOf(rid, COUPON_ROLES);
  if (!member.ok) return member;
  const supabase = await createSupabaseServerClient();
  return { ...member, supabase };
}

function fail(error: unknown): CouponActionResult {
  if (error && typeof error === "object" && (error as { code?: string }).code === "23505") {
    return { ok: false, fieldErrors: { code: "Já existe um cupom com este código." } };
  }
  const parsed = parseMenzuError(error);
  if (parsed.code === "FEATURE_NOT_IN_PLAN") {
    return { ok: false, error: "Seu plano não inclui limites de uso ou desconto máximo. Deixe esses campos vazios para criar o cupom ou altere seu plano." };
  }
  if (parsed.code === "PLAN_LIMIT_REACHED") {
    return { ok: false, error: "Seu plano atingiu o limite de cupons ativos. Desative outro cupom, crie este como inativo ou altere seu plano." };
  }
  return { ok: false, error: parsed.message };
}

function refresh() {
  revalidatePath("/painel/cupons");
}

export async function createCouponAction(rid: string, input: CouponInput): Promise<CouponActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId } = ctx;
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { data, error } = await supabase
    .from("coupons")
    .insert({ ...parsed.data, restaurant_id: restaurantId })
    .select("id")
    .single();
  if (error || !data) return fail(error);
  refresh();
  return { ok: true, id: data.id };
}

export async function updateCouponAction(rid: string, id: string, input: CouponInput): Promise<CouponActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId } = ctx;
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, error: NOT_FOUND };
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const { data, error } = await supabase
    .from("coupons")
    .update(parsed.data)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  refresh();
  return { ok: true, id };
}

export async function setCouponActiveAction(rid: string, id: string, active: boolean): Promise<CouponActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId } = ctx;
  if (typeof id !== "string" || !UUID.test(id) || typeof active !== "boolean") return { ok: false, error: NOT_FOUND };
  const { data, error } = await supabase
    .from("coupons")
    .update({ is_active: active })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  refresh();
  return { ok: true, id };
}

/**
 * Deletes a coupon that was never redeemed. Redemptions cascade on delete, which would erase the
 * per-customer usage history (and reset limits), so used coupons must be deactivated instead.
 */
export async function deleteCouponAction(rid: string, id: string): Promise<CouponActionResult> {
  const ctx = await context(rid);
  if (!ctx.ok) return ctx;
  const { supabase, restaurantId } = ctx;
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, error: NOT_FOUND };
  const { count, error: countError } = await supabase
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("coupon_id", id);
  if (countError) return fail(countError);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Este cupom já foi usado em pedidos. Desative-o em vez de excluir." };
  }
  const { data, error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .eq("used_count", 0)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  refresh();
  return { ok: true, id };
}
