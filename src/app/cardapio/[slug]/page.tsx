import type { Metadata } from "next";
import { redirectOldSlug } from "@/server/queries/old-slug";
import { MenuView } from "@/components/menu/menu-view";
import { isPreviewRestaurant, previewDishes, PREVIEW_ID } from "@/lib/restaurant-preview";
import { restaurantOpenState } from "@/lib/opening-hours";
import { getPublicMenu, getPublicRestaurant, getRestaurantRating, publicTableExists } from "@/server/queries/public-menu";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await getPublicRestaurant(slug);
  if (!r) return { title: "Cardápio não encontrado" };
  return {
    title: `${r.name} · Cardápio`,
    description: r.description ?? `Peça online no ${r.name}.`,
  };
}

export default async function MenuPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await getPublicMenu(slug);
  if (!data) return redirectOldSlug(slug, "", sp);
  const r = data.restaurant;

  const rawTable = Array.isArray(sp.table) ? sp.table[0] : sp.table;
  let table: number | null = null;
  let invalidTable: number | null = null;
  if (rawTable && /^\d{1,4}$/.test(rawTable)) {
    const n = Number(rawTable);
    if (r.acceptsDineIn && (await publicTableExists(r.id, n))) table = n;
    else invalidTable = n;
  }

  const openState = restaurantOpenState(r, r.hours, r.timezone, new Date());
  const [firstMenu, ...otherMenus] = data.menus;
  const categoryId = PREVIEW_ID + "massas";
  const menuData = firstMenu && isPreviewRestaurant(r) ? {
    ...data,
    menus: [{
      ...firstMenu,
      categories: [...firstMenu.categories, {
        id: categoryId,
        name: "Massas de demonstração",
        description: "Pratos ilustrativos para visualização.",
        products: previewDishes.map((dish, index) => ({
          id: PREVIEW_ID + index,
          categoryId,
          name: dish.name,
          description: "Prato de demonstração.",
          imageUrl: dish.image_url,
          priceCents: dish.price_cents,
          promoPriceCents: null,
          available: false,
          variants: [],
          addonGroups: [],
        })),
      }],
    }, ...otherMenus],
  } : data;
  return <MenuView data={menuData} openState={openState} table={table} invalidTable={invalidTable} rating={await getRestaurantRating(r.id)} />;
}
