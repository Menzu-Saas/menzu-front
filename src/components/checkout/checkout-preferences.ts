import { z } from "zod";
import type { QuoteAddress } from "@/components/cart/use-quote";
import { currentDeliverySelection } from "@/lib/delivery-selection";

export type CheckoutAddress = QuoteAddress;
export type SavedCheckoutAddress = CheckoutAddress & { id: string };
export const EMPTY_CHECKOUT_ADDRESS: CheckoutAddress = {
  cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", reference: "",
};

const field = z.string().trim().min(1).max(200);
export const checkoutAddressSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  cep: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().regex(/^\d{8}$/, "Informe um CEP de 8 dígitos.")),
  street: field, number: z.string().trim().min(1).max(20), neighborhood: field, city: field,
  complement: z.string().trim().max(200).optional(),
  state: z.string().trim().toUpperCase().regex(/^([A-Z]{2})?$/, "Informe uma UF de 2 letras.").optional(),
  reference: z.string().trim().max(200).optional(),
});
const addressesSchema = z.array(checkoutAddressSchema.extend({ id: z.string().min(1).max(100) })).max(10);
const couponSchema = z.string().trim().toUpperCase().min(1).max(20);
const couponsSchema = z.array(couponSchema).max(5);
const key = (buyerId: string, kind: string, slug?: string) =>
  `menzu-checkout:${encodeURIComponent(buyerId)}:${kind}${slug === undefined ? "" : `:${encodeURIComponent(slug)}`}`;

function read<T>(storageKey: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw || raw.length > 30000) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch { return fallback; }
}

function write(storageKey: string, value: unknown) {
  try { localStorage.setItem(storageKey, JSON.stringify(value)); }
  catch { /* Storage is optional; checkout remains available. */ }
}

export function loadSavedAddresses(buyerId: string): SavedCheckoutAddress[] {
  return buyerId ? read(key(buyerId, "addresses"), addressesSchema, []) : [];
}

/** Guest location selection has no identity or house number; never import legacy customer PII. */
export function loadSelectedAddress(): Partial<CheckoutAddress> {
  try {
    const raw = currentDeliverySelection();
    if (raw.length > 1200) return {};
    const values: unknown = JSON.parse(raw);
    if (!Array.isArray(values) || values.length !== 5 || !values.every((value) => typeof value === "string" && value.length <= 200)) return {};
    const [cep, neighborhood, city, state, street] = values as string[];
    const result = checkoutAddressSchema.omit({ number: true }).partial().safeParse({ cep, neighborhood, city, state, ...(street ? { street } : {}) });
    return result.success ? result.data : {};
  } catch { return {}; }
}

function fingerprint(address: CheckoutAddress) {
  return Object.keys(EMPTY_CHECKOUT_ADDRESS).map((field) =>
    String(address[field as keyof CheckoutAddress] ?? "").trim().toLocaleLowerCase("pt-BR")).join("\u0000");
}

export function saveAddress(buyerId: string, address: CheckoutAddress, existingId?: string): SavedCheckoutAddress | null {
  const parsed = checkoutAddressSchema.safeParse(address);
  if (!buyerId || !parsed.success) return null;
  const saved = loadSavedAddresses(buyerId);
  const duplicate = saved.find((item) => fingerprint(item) === fingerprint(parsed.data));
  const existing = saved.find((item) => item.id === existingId);
  if (!duplicate && !existing && saved.length >= 10) return null;
  const entry = { ...parsed.data, id: duplicate?.id ?? existing?.id ?? crypto.randomUUID() };
  write(key(buyerId, "addresses"), [entry, ...saved.filter((item) => item.id !== entry.id && item.id !== existing?.id)]);
  return entry;
}

export function deleteSavedAddress(buyerId: string, id: string) {
  if (buyerId) write(key(buyerId, "addresses"), loadSavedAddresses(buyerId).filter((item) => item.id !== id));
}

export function clearSavedAddresses(buyerId: string) {
  if (buyerId) write(key(buyerId, "addresses"), []);
}

export function loadRecentCoupons(buyerId: string, slug: string): string[] {
  return buyerId && slug ? read(key(buyerId, "coupons", slug), couponsSchema, []) : [];
}

export function rememberCoupon(buyerId: string, slug: string, code: string) {
  const parsed = couponSchema.safeParse(code);
  if (!buyerId || !slug || !parsed.success) return;
  write(key(buyerId, "coupons", slug), [parsed.data, ...loadRecentCoupons(buyerId, slug).filter((item) => item !== parsed.data)].slice(0, 5));
}
