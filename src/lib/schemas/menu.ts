import { z } from "zod";
import { parseMoneyToCents } from "@/lib/money";
import { MANAGEMENT_ROLES } from "@/lib/roles";

/** Roles that manage menus, products and addon groups (spec §2 matrix; RLS enforces the same). */
export const MENU_ROLES = MANAGEMENT_ROLES;

/** Product image upload limits (Storage bucket `restaurant-assets`). */
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

/** Returns a pt-BR error for an unacceptable image file, or null when it can be uploaded. */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(file.type in IMAGE_TYPES)) return "Envie uma imagem JPG, PNG ou WEBP.";
  if (file.size > IMAGE_MAX_BYTES) return "A imagem deve ter no máximo 3 MB.";
  return null;
}

const MAX_CENTS = 10_000_000; // R$ 100.000,00
const MONEY_TEXT = /^\s*(?:R\$)?\s*[\d.]*\d(?:,\d{0,2})?\s*$|^\s*(?:R\$)?\s*\d+\.\d{1,2}\s*$/;

/**
 * Money typed by a person ("29,90", "R$ 1.234,50", "7") or already in cents (number) → integer cents.
 * The browser never sends prices for orders; this is only for admin forms.
 */
export function moneyInput(required = "Informe o valor.") {
  return z
    .union([z.string(), z.number()], { error: required })
    .transform((value, ctx) => {
      if (typeof value === "number") {
        if (!Number.isInteger(value)) {
          ctx.addIssue({ code: "custom", message: "Valor inválido." });
          return z.NEVER;
        }
        return value;
      }
      if (value.trim() === "") {
        ctx.addIssue({ code: "custom", message: required });
        return z.NEVER;
      }
      if (!MONEY_TEXT.test(value)) {
        ctx.addIssue({ code: "custom", message: "Valor inválido. Ex.: 29,90" });
        return z.NEVER;
      }
      return parseMoneyToCents(value);
    })
    .pipe(
      z
        .number()
        .int()
        .min(0, { error: "O valor não pode ser negativo." })
        .max(MAX_CENTS, { error: "Valor muito alto." }),
    );
}

/** Optional money: "" / null / undefined → null. */
const optionalMoney = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => (v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : v))
  .pipe(z.union([z.null(), moneyInput()]));

const name = (max: number, required: string) =>
  z
    .string({ error: required })
    .trim()
    .min(1, { error: required })
    .max(max, { error: `Use no máximo ${max} caracteres.` });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Use no máximo ${max} caracteres.` })
    .nullish()
    .transform((v) => (v ? v : null));

/** Integer typed in an input ("12") or a number. Empty → null (callers decide what null means). */
const optionalInt = (message: string) =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      if (s === "") return null;
      if (!/^\d+$/.test(s)) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return Number(s);
    })
    .pipe(z.number().int().min(0).max(1_000_000, { error: message }).nullable());

const intField = (message: string, min: number, max: number) =>
  z.coerce
    .number({ error: message })
    .int({ error: message })
    .min(min, { error: message })
    .max(max, { error: message });

const uuid = (message: string) => z.uuid({ error: message });

export const menuSchema = z.object({
  name: name(80, "Informe o nome do cardápio."),
  is_active: z.boolean().default(true),
});
export type MenuInput = z.input<typeof menuSchema>;

export const categorySchema = z.object({
  name: name(80, "Informe o nome da categoria."),
  description: optionalText(300),
  is_active: z.boolean().default(true),
});
export type CategoryInput = z.input<typeof categorySchema>;

export const variantSchema = z
  .object({
    id: uuid("Variação inválida.").optional(),
    name: name(80, "Informe o nome da variação."),
    price: moneyInput("Informe o preço."),
    is_available: z.boolean().default(true),
  })
  .transform(({ price, ...v }) => ({ id: v.id, name: v.name, price_cents: price, is_available: v.is_available }));

const imageUrl = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (v) => {
      try {
        const u = new URL(v);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    },
    { error: "Imagem inválida." },
  )
  .nullish()
  .transform((v) => v ?? null);

export const productSchema = z
  .object({
    name: name(120, "Informe o nome do produto."),
    description: optionalText(500),
    category_id: uuid("Escolha uma categoria."),
    price: moneyInput("Informe o preço."),
    promo_price: optionalMoney,
    is_available: z.boolean().default(true),
    stock: optionalInt("Informe um número inteiro (ou deixe vazio para ilimitado)."),
    status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
    image_url: imageUrl,
    variants: z.array(variantSchema).max(30, { error: "Use no máximo 30 variações." }).default([]),
    addon_group_ids: z
      .array(uuid("Grupo de complementos inválido."))
      .max(30)
      .default([])
      .transform((ids) => [...new Set(ids)]),
  })
  .superRefine((p, ctx) => {
    if (p.promo_price !== null && p.promo_price >= p.price) {
      ctx.addIssue({
        code: "custom",
        path: ["promo_price"],
        message: "O preço promocional deve ser menor que o preço.",
      });
    }
  })
  .transform(({ price, promo_price, stock, ...p }) => ({
    ...p,
    price_cents: price,
    promo_price_cents: promo_price,
    stock_quantity: stock,
  }));
export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

export const addonOptionSchema = z
  .object({
    id: uuid("Opção inválida.").optional(),
    name: name(80, "Informe o nome da opção."),
    price: moneyInput("Informe o preço (0 para grátis)."),
    max_quantity: intField("Use de 1 a 99.", 1, 99).default(1),
    is_available: z.boolean().default(true),
  })
  .transform(({ price, ...o }) => ({
    id: o.id,
    name: o.name,
    price_cents: price,
    max_quantity: o.max_quantity,
    is_available: o.is_available,
  }));

export const addonGroupSchema = z
  .object({
    name: name(80, "Informe o nome do grupo."),
    is_required: z.boolean().default(false),
    min_select: intField("Use um número de 0 a 50.", 0, 50),
    max_select: intField("Use um número de 1 a 50.", 1, 50),
    options: z
      .array(addonOptionSchema)
      .min(1, { error: "Adicione pelo menos uma opção." })
      .max(50, { error: "Use no máximo 50 opções." }),
  })
  .superRefine((g, ctx) => {
    if (g.max_select < g.min_select) {
      ctx.addIssue({ code: "custom", path: ["max_select"], message: "O máximo deve ser maior ou igual ao mínimo." });
    }
    if (g.is_required && g.min_select < 1) {
      ctx.addIssue({ code: "custom", path: ["min_select"], message: "Grupo obrigatório exige mínimo de 1." });
    }
    const reachable = g.options.filter((o) => o.is_available).reduce((n, o) => n + o.max_quantity, 0);
    if (g.min_select > reachable) {
      ctx.addIssue({
        code: "custom",
        path: ["min_select"],
        message: "O mínimo é maior do que as opções disponíveis permitem escolher.",
      });
    }
  });
export type AddonGroupInput = z.input<typeof addonGroupSchema>;
export type AddonGroupData = z.output<typeof addonGroupSchema>;

export const ASSETS_BUCKET = "restaurant-assets";

/** File name of an uploaded product image: `{uuid}.{jpg|png|webp}`. */
const PRODUCT_IMAGE_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;

/** Public URL prefix of the assets bucket for a Supabase project URL. */
export function assetsPublicPrefix(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${ASSETS_BUCKET}/`;
}

/**
 * Object path (inside the assets bucket) of a product image owned by `restaurantId`, or null when the URL
 * is not one of that restaurant's product images (foreign URL, other tenant, path traversal).
 */
export function productImagePath(url: string | null, supabaseUrl: string, restaurantId: string): string | null {
  if (!url) return null;
  const prefix = assetsPublicPrefix(supabaseUrl);
  if (!url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  const folder = `${restaurantId}/products/`;
  if (!path.startsWith(folder)) return null;
  return PRODUCT_IMAGE_FILE.test(path.slice(folder.length)) ? path : null;
}
