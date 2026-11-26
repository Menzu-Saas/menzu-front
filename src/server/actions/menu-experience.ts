"use server";

import { revalidatePath } from "next/cache";
import { menuExperienceSchema } from "@/lib/menu-experience";
import { MENU_ROLES } from "@/lib/schemas/menu";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMemberOf } from "@/server/auth";
import type { MenuActionResult } from "./menu";

export async function saveMenuExperienceAction(rid: string, input: unknown): Promise<MenuActionResult> {
  const ctx = await requireMemberOf(rid, MENU_ROLES);
  if (!ctx.ok) return ctx;
  const parsed = menuExperienceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Confira as seções e os produtos de destaque." };
  const db = await createSupabaseServerClient();
  const ids = parsed.data.featuredProductIds;
  if (ids.length) {
    const { data, error } = await db.from("products").select("id").eq("restaurant_id", ctx.restaurantId).in("id", ids);
    if (error || data?.length !== ids.length) return { ok: false, error: "Selecione produtos deste restaurante." };
  }
  const { error } = await db.from("menu_experience_settings").upsert({
    restaurant_id: ctx.restaurantId,
    section_order: parsed.data.sections.map((section) => section.id),
    enabled_sections: parsed.data.sections.filter((section) => section.enabled).map((section) => section.id),
    featured_product_ids: ids,
  });
  if (error) return { ok: false, error: "Não foi possível salvar a apresentação do cardápio." };
  revalidatePath("/painel/cardapio");
  revalidatePath(`/cardapio/${ctx.restaurant.slug}`, "layout");
  return { ok: true };
}
