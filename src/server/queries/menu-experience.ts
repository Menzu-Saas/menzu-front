import "server-only";

import { menuExperienceSettings } from "@/lib/menu-experience";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminMenuExperience(restaurantId: string) {
  const db = await createSupabaseServerClient();
  const [settings, products] = await Promise.all([
    db.from("menu_experience_settings").select("section_order, enabled_sections, featured_product_ids").eq("restaurant_id", restaurantId).maybeSingle(),
    db.from("products").select("id, name").eq("restaurant_id", restaurantId).order("name"),
  ]);
  if (settings.error) throw settings.error;
  if (products.error) throw products.error;
  const availableIds = new Set((products.data ?? []).map((product) => product.id));
  const config = menuExperienceSettings(settings.data);
  return { settings: { ...config, featuredProductIds: config.featuredProductIds.filter((id) => availableIds.has(id)) }, products: products.data ?? [] };
}
