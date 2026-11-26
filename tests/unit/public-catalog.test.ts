import { beforeEach, expect, it, vi } from "vitest";
import { getPublicMenu, publicTableExists } from "@/server/queries/public-menu";

vi.mock("server-only", () => ({}));
const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from, rpc }) }));

beforeEach(() => {
  vi.resetAllMocks();
});

it("assembles the storefront from the catalog projection and respects unavailable variants", async () => {
  const restaurant = { id: "restaurant", slug: "teste", name: "Loja" };
  const read = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  from.mockImplementation((table: string) => {
    if (table === "public_restaurants") return { ...read, maybeSingle: async () => ({ data: restaurant }) };
    if (table === "menu_experience_settings") return { ...read, maybeSingle: async () => ({ data: null }) };
    if (table === "delivery_zones" || table === "opening_hours") return read;
    throw new Error(`Unexpected table ${table}`);
  });
  const product = {
    category_id: "category", name: "Produto", description: null, image_url: null,
    price_cents: 500, promo_price_cents: 300, position: 0,
  };
  rpc.mockImplementation(async (name: string) => {
    if (name === "public_menu_bestsellers") return { data: [] };
    if (name !== "menzu_public_catalog") throw new Error(`Unexpected RPC ${name}`);
    return { data: {
      menus: [{ id: "menu", name: "Cardápio", position: 0 }],
      categories: [{ id: "category", menu_id: "menu", name: "Categoria", description: null, position: 0 }],
      products: [
        { ...product, id: "sold-out", available: false },
        { ...product, id: "variant-unavailable", available: true },
        { ...product, id: "available", available: true },
      ],
      variants: [{ id: "variant", product_id: "variant-unavailable", name: "Grande", price_cents: 700, is_available: false, position: 0 }],
      links: [], groups: [], options: [],
    } };
  });

  const menu = await getPublicMenu("teste");
  expect(rpc).toHaveBeenCalledWith("menzu_public_catalog", { p_restaurant_id: restaurant.id });
  expect(menu?.menus[0]?.categories[0]?.products.map((p) => [p.id, p.available, p.promoPriceCents])).toEqual([
    ["sold-out", false, 300], ["variant-unavailable", false, null], ["available", true, 300],
  ]);
});

it("accepts only a successful boolean table lookup for a valid table number", async () => {
  rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } });
  expect(await publicTableExists("restaurant", 12)).toBe(true);
  expect(await publicTableExists("restaurant", 15)).toBe(false);
  expect(await publicTableExists("restaurant", 0)).toBe(false);
  expect(rpc).toHaveBeenNthCalledWith(1, "menzu_public_table_exists", { p_restaurant_id: "restaurant", p_table_number: 12 });
  expect(rpc).toHaveBeenCalledTimes(2);
  expect(from).not.toHaveBeenCalled();
});
