import type { Metadata } from "next";
import { MenuManager } from "@/components/menu-admin/menu-manager";
import { MenuExperienceEditor } from "@/components/menu-admin/menu-experience-editor";
import { getAdminMenuExperience } from "@/server/queries/menu-experience";
import { PageHeader } from "@/components/ui";
import { MENU_ROLES } from "@/lib/schemas/menu";
import { requireMember } from "@/server/auth";
import { isPreviewRestaurant, previewDishes, PREVIEW_ID } from "@/lib/restaurant-preview";
import { listAddonGroups, listCategories, listMenus, listProductCards } from "@/server/queries/menu";

export const metadata: Metadata = { title: "Cardápio" };

type SearchParams = Promise<{ menu?: string | string[]; categoria?: string | string[] }>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CardapioPage({ searchParams }: { searchParams: SearchParams }) {
  const { restaurantId, restaurant } = await requireMember(MENU_ROLES);
  const params = await searchParams;
  const menus = await listMenus(restaurantId);
  const experience = await getAdminMenuExperience(restaurantId);
  const menu = menus.find((m) => m.id === one(params.menu)) ?? menus[0];

  const [categories, addonGroups] = await Promise.all([
    menu ? listCategories(restaurantId, menu.id) : Promise.resolve([]),
    listAddonGroups(restaurantId),
  ]);
  const products = await listProductCards(
    restaurantId,
    categories.map((c) => c.id),
  );
  const wanted = one(params.categoria);
  const initialCategoryId = categories.find((c) => c.id === wanted)?.id ?? categories[0]?.id ?? null;
  const examples = initialCategoryId && isPreviewRestaurant(restaurant) ? previewDishes.map((dish, index) => ({
    ...dish, id: PREVIEW_ID + index, category_id: initialCategoryId, promo_price_cents: null,
    is_available: true, stock_quantity: 20, status: "ACTIVE" as const, addons: 0, sales: 0,
  })) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Painel · Cardápio"
        title="Gestão de cardápio"
        description="Organize categorias, itens, preços e disponibilidade."
      />
      {menu ? (
        <MenuManager
          key={menu.id}
          menus={menus}
          menuId={menu.id}
          categories={categories}
          products={[...products, ...examples]}
          addonGroups={addonGroups}
          initialCategoryId={initialCategoryId}
        />
      ) : (
        <p className="text-body-sm text-ink-muted">Nenhum cardápio encontrado.</p>
      )}
      <MenuExperienceEditor key={restaurantId} settings={experience.settings} products={experience.products} />
    </div>
  );
}
