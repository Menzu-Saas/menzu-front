// Cart / order payload sent by the browser. Untrusted: only ids, quantities and text travel.
// Unknown keys (prices, totals, discounts, fees, honeypots…) are stripped; the SQL pricing
// function (`menzu_price_cart`) is the single source of truth for every amount.
import { z } from "zod";
import { isValidBrPhone, onlyDigits } from "@/lib/phone";

const text = (max: number) => z.string().trim().max(max);

export const addressSchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    cep: text(9),
    street: text(200),
    number: text(20),
    complement: text(200).optional(),
    neighborhood: text(200),
    city: text(200),
    state: text(2).optional(),
    reference: text(200).optional(),
  })
  .partial()
  .strip();

export const cartItemSchema = z
  .object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().nullable().optional(),
    quantity: z.number().int().min(1).max(99),
    notes: z.string().max(140).optional(),
    addons: z
      .array(z.object({ option_id: z.string().uuid(), quantity: z.number().int().min(1).max(99) }).strip())
      .max(30)
      .default([]),
  })
  .strip();

export const customerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().max(30).transform(onlyDigits).refine(isValidBrPhone, "Telefone inválido."),
    // Optional; Mercado Pago requires it for PIX (enforced in placeOrder). An empty field counts as absent.
    email: z
      .union([z.literal(""), z.string().trim().email().max(120)])
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .strip();

export const orderTypeSchema = z.enum(["DELIVERY", "PICKUP", "DINE_IN"]);
export const paymentMethodSchema = z.enum(["PIX", "CARD_ONLINE", "CASH"]);
export const cardTypeSchema = z.enum(["CREDIT", "DEBIT"]);
export type CardType = z.infer<typeof cardTypeSchema>;

const orderFieldsSchema = z
  .object({
    restaurant_slug: z.string().min(2).max(50),
    type: orderTypeSchema,
    table_number: z.number().int().positive().nullable().optional(),
    customer: customerSchema,
    address: addressSchema.nullable().optional(),
    scheduled_for: z.iso.datetime({ offset: true }).nullable().optional(),
    coupon_code: z.string().trim().max(20).nullable().optional(),
    payment_method: paymentMethodSchema,
    card_type: cardTypeSchema.optional(),
    change_for_cents: z.number().int().min(0).nullable().optional(),
    notes: z.string().max(280).optional(),
    items: z.array(cartItemSchema).min(1).max(50),
  })
  .strip();

const validCardType = (order: { card_type?: CardType; payment_method?: string }) =>
  order.card_type === undefined || order.payment_method === "CARD_ONLINE";
const cardTypeIssue = { path: ["card_type"], message: "Tipo de cartão permitido apenas para pagamento online com cartão." };

export const orderPayloadSchema = orderFieldsSchema.refine(validCardType, cardTypeIssue).refine(
  ({ type, address }) => type !== "DELIVERY" || Boolean(
    address?.cep && /^\d{5}-?\d{3}$/.test(address.cep)
    && address.street && address.number && address.neighborhood && address.city,
  ),
  { path: ["address"], message: "Informe CEP, rua, número, bairro e cidade para a entrega." },
);
export const quotePayloadSchema = orderFieldsSchema.partial({ customer: true, payment_method: true }).refine(validCardType, cardTypeIssue);

export type CartItemPayload = z.infer<typeof cartItemSchema>;
export type OrderPayload = z.infer<typeof orderPayloadSchema>;
export type QuotePayload = z.infer<typeof quotePayloadSchema>;

export type QuoteItemAddon = {
  option_id: string;
  group_name: string;
  option_name: string;
  unit_price_cents: number;
  quantity: number;
};

export type QuoteItem = {
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  unit_price_cents: number;
  quantity: number;
  notes: string | null;
  total_cents: number;
  addons: QuoteItemAddon[];
};

export type OrderQuote = {
  items: QuoteItem[];
  subtotal_cents: number;
  discount_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  coupon: { id: string; code: string } | null;
  coupon_error?: { code: string; message: string };
  delivery_zone: { id: string; name: string; est_minutes: number } | null;
  estimated_minutes: number;
};
