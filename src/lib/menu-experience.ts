import { z } from "zod";

export const MENU_SECTION_IDS = ["offers", "bestsellers", "favorites", "featured"] as const;
export type MenuSectionId = (typeof MENU_SECTION_IDS)[number];
export type MenuSection = { id: MenuSectionId; enabled: boolean };
export const DEFAULT_MENU_SECTIONS: MenuSection[] = MENU_SECTION_IDS.map((id) => ({ id, enabled: true }));

export const menuExperienceSchema = z.object({
  sections: z.array(z.object({ id: z.enum(MENU_SECTION_IDS), enabled: z.boolean() })).length(4)
    .refine((sections) => new Set(sections.map((section) => section.id)).size === 4, "Informe cada seção uma vez."),
  featuredProductIds: z.array(z.uuid()).max(50)
    .refine((ids) => new Set(ids).size === ids.length, "Não repita produtos de destaque."),
});
export type MenuExperienceSettings = z.infer<typeof menuExperienceSchema>;
export type PublicMenuExperience = MenuExperienceSettings & { bestsellers: { productId: string; quantity: number }[] };

export function menuExperienceSettings(row?: { section_order: string[]; enabled_sections: string[]; featured_product_ids: string[] } | null): MenuExperienceSettings {
  if (!row) return { sections: DEFAULT_MENU_SECTIONS.map((section) => ({ ...section })), featuredProductIds: [] };
  const parsed = menuExperienceSchema.safeParse({
    sections: row.section_order.map((id) => ({ id, enabled: row.enabled_sections.includes(id) })),
    featuredProductIds: row.featured_product_ids,
  });
  return parsed.success ? parsed.data : menuExperienceSettings();
}
