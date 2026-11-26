import { describe, expect, it } from "vitest";
import {
  addonGroupSchema,
  categorySchema,
  menuSchema,
  moneyInput,
  productImagePath,
  productSchema,
  validateImageFile,
} from "@/lib/schemas/menu";

const CATEGORY = "3f1c2a4e-1b2c-4d3e-8f90-123456789abc";
const GROUP = "7a1c2a4e-1b2c-4d3e-8f90-123456789abc";

const baseProduct = {
  name: "Burger clássico",
  description: "",
  category_id: CATEGORY,
  price: "29,90",
  promo_price: "",
  is_available: true,
  stock: "",
  status: "ACTIVE" as const,
  image_url: null,
  variants: [],
  addon_group_ids: [],
};

function paths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((i) => i.path.map(String).join(".")) ?? [];
}

describe("moneyInput", () => {
  it("parses pt-BR strings and numbers to integer cents", () => {
    expect(moneyInput().parse("29,90")).toBe(2990);
    expect(moneyInput().parse("R$ 1.234,50")).toBe(123450);
    expect(moneyInput().parse("7")).toBe(700);
    expect(moneyInput().parse(4690)).toBe(4690);
  });

  it("rejects empty and garbage input", () => {
    expect(moneyInput().safeParse("").success).toBe(false);
    expect(moneyInput().safeParse("abc").success).toBe(false);
    expect(moneyInput().safeParse(-1).success).toBe(false);
  });
});

describe("productSchema", () => {
  it("parses the price from '29,90' into cents and normalizes optional fields", () => {
    const p = productSchema.parse(baseProduct);
    expect(p.price_cents).toBe(2990);
    expect(p.promo_price_cents).toBeNull();
    expect(p.stock_quantity).toBeNull();
    expect(p.description).toBeNull();
  });

  it("requires the promotional price to be lower than the price", () => {
    const equal = productSchema.safeParse({ ...baseProduct, promo_price: "29,90" });
    expect(equal.success).toBe(false);
    expect(paths(equal)).toContain("promo_price");
    const higher = productSchema.safeParse({ ...baseProduct, promo_price: "35" });
    expect(higher.success).toBe(false);
    const lower = productSchema.parse({ ...baseProduct, promo_price: "24,90" });
    expect(lower.promo_price_cents).toBe(2490);
  });

  it("treats an empty stock as unlimited and validates integers", () => {
    expect(productSchema.parse({ ...baseProduct, stock: "12" }).stock_quantity).toBe(12);
    expect(productSchema.parse({ ...baseProduct, stock: "0" }).stock_quantity).toBe(0);
    expect(paths(productSchema.safeParse({ ...baseProduct, stock: "-2" }))).toContain("stock");
    expect(paths(productSchema.safeParse({ ...baseProduct, stock: "1,5" }))).toContain("stock");
  });

  it("requires a name and a category", () => {
    const bad = productSchema.safeParse({ ...baseProduct, name: "  ", category_id: "" });
    expect(paths(bad)).toEqual(expect.arrayContaining(["name", "category_id"]));
  });

  it("validates variants (name + price) and de-duplicates addon groups", () => {
    const p = productSchema.parse({
      ...baseProduct,
      variants: [
        { name: "Simples", price: "29,90" },
        { id: CATEGORY, name: "Duplo", price: "39,90", is_available: false },
      ],
      addon_group_ids: [GROUP, GROUP],
    });
    expect(p.variants).toEqual([
      { id: undefined, name: "Simples", price_cents: 2990, is_available: true },
      { id: CATEGORY, name: "Duplo", price_cents: 3990, is_available: false },
    ]);
    expect(p.addon_group_ids).toEqual([GROUP]);
    const bad = productSchema.safeParse({ ...baseProduct, variants: [{ name: "", price: "" }] });
    expect(paths(bad)).toEqual(expect.arrayContaining(["variants.0.name", "variants.0.price"]));
  });

  it("rejects an image URL that is not http(s)", () => {
    expect(productSchema.safeParse({ ...baseProduct, image_url: "javascript:alert(1)" }).success).toBe(false);
    expect(productSchema.safeParse({ ...baseProduct, image_url: "https://x.supabase.co/a.png" }).success).toBe(true);
  });
});

describe("categorySchema / menuSchema", () => {
  it("trims names and enforces length", () => {
    expect(categorySchema.parse({ name: "  Massas ", description: "" })).toEqual({
      name: "Massas",
      description: null,
      is_active: true,
    });
    expect(categorySchema.safeParse({ name: "" }).success).toBe(false);
    expect(menuSchema.safeParse({ name: "x".repeat(81) }).success).toBe(false);
    expect(menuSchema.parse({ name: "Almoço" })).toEqual({ name: "Almoço", is_active: true });
  });
});

describe("addonGroupSchema", () => {
  const group = {
    name: "Molhos",
    is_required: false,
    min_select: 0,
    max_select: 2,
    options: [{ name: "Barbecue", price: "2,50", max_quantity: 1, is_available: true }],
  };

  it("accepts a valid group and parses option prices", () => {
    const g = addonGroupSchema.parse(group);
    expect(g.options[0].price_cents).toBe(250);
  });

  it("requires max >= min", () => {
    const bad = addonGroupSchema.safeParse({ ...group, min_select: 3, max_select: 2 });
    expect(paths(bad)).toContain("max_select");
  });

  it("requires min >= 1 when the group is required", () => {
    const bad = addonGroupSchema.safeParse({ ...group, is_required: true, min_select: 0 });
    expect(paths(bad)).toContain("min_select");
    expect(addonGroupSchema.safeParse({ ...group, is_required: true, min_select: 1 }).success).toBe(true);
  });

  it("rejects a minimum the available options cannot satisfy", () => {
    const bad = addonGroupSchema.safeParse({ ...group, is_required: true, min_select: 2, max_select: 3 });
    expect(paths(bad)).toContain("min_select");
    const ok = addonGroupSchema.safeParse({
      ...group,
      is_required: true,
      min_select: 2,
      max_select: 3,
      options: [{ ...group.options[0], max_quantity: 2 }],
    });
    expect(ok.success).toBe(true);
  });

  it("requires at least one option and a valid max quantity", () => {
    expect(paths(addonGroupSchema.safeParse({ ...group, options: [] }))).toContain("options");
    const bad = addonGroupSchema.safeParse({ ...group, options: [{ ...group.options[0], max_quantity: 0 }] });
    expect(paths(bad)).toContain("options.0.max_quantity");
  });

  it("coerces numeric strings from inputs", () => {
    const g = addonGroupSchema.parse({ ...group, min_select: "1", max_select: "3", is_required: true });
    expect([g.min_select, g.max_select]).toEqual([1, 3]);
  });
});

describe("validateImageFile", () => {
  it("accepts jpg/png/webp up to 3MB", () => {
    expect(validateImageFile({ type: "image/png", size: 1024 })).toBeNull();
    expect(validateImageFile({ type: "image/webp", size: 3 * 1024 * 1024 })).toBeNull();
  });
  it("rejects other types and large files", () => {
    expect(validateImageFile({ type: "image/gif", size: 10 })).toMatch(/JPG, PNG ou WEBP/);
    expect(validateImageFile({ type: "image/jpeg", size: 3 * 1024 * 1024 + 1 })).toMatch(/3 MB/);
  });
});

describe("productImagePath", () => {
  const base = "https://abc.supabase.co";
  const rid = "11111111-1111-4111-8111-111111111111";
  const file = "0a1b2c3d-1111-4111-8111-123456789abc.png";
  it("extracts the object path of the restaurant's own product image", () => {
    const url = `${base}/storage/v1/object/public/restaurant-assets/${rid}/products/${file}`;
    expect(productImagePath(url, base, rid)).toBe(`${rid}/products/${file}`);
  });
  it("rejects other tenants, other buckets and traversal", () => {
    const other = "22222222-2222-4222-8222-222222222222";
    expect(productImagePath(`${base}/storage/v1/object/public/restaurant-assets/${other}/products/${file}`, base, rid)).toBeNull();
    expect(productImagePath(`${base}/storage/v1/object/public/other/${rid}/products/${file}`, base, rid)).toBeNull();
    expect(productImagePath(`${base}/storage/v1/object/public/restaurant-assets/${rid}/products/../x.png`, base, rid)).toBeNull();
    expect(productImagePath("https://evil.test/x.png", base, rid)).toBeNull();
    // The dot before the extension is literal: "{uuid}Xpng" is not an image name.
    const noDot = `${base}/storage/v1/object/public/restaurant-assets/${rid}/products/${file.replace(".png", "xpng")}`;
    expect(productImagePath(noDot, base, rid)).toBeNull();
    expect(productImagePath(`${base}/storage/v1/object/public/restaurant-assets/${rid}/products/${file}.gif`, base, rid)).toBeNull();
    expect(productImagePath(null, base, rid)).toBeNull();
  });
});
