import type { QuoteAddress } from "@/components/cart/use-quote";
import { cpfDigits, isValidCpf } from "@/lib/cpf";
import type { PaymentMethod } from "@/lib/types";
import type { CardType } from "@/lib/schemas/order";

/**
 * Customer details remembered on this device (never sent anywhere except with an order/quote).
 * Only the payment *method* is remembered — never card data (Checkout Pro keeps the customer's
 * cards in their own Mercado Pago account).
 */
export type RememberedCustomer = {
  /** When saved by checkout, prevents prefilling another signed-in buyer's details. */
  buyerId?: string;
  name: string;
  phone: string;
  email: string;
  /** CPF (só dígitos) lembrado neste aparelho, para pagamentos online. Só para quem não tem conta salva. */
  cpf?: string;
  address: Partial<QuoteAddress> | null;
  /** Last payment method used; the checkout preselects it only while the restaurant still offers it. */
  paymentMethod?: PaymentMethod | null;
  cardType?: CardType;
  /** Last "troco para" (cash only), in cents. */
  changeForCents?: number | null;
};

const KEY = "menzu-customer";
const METHODS: readonly PaymentMethod[] = ["PIX", "CARD_ONLINE", "CARD_ON_DELIVERY", "CASH"];
const ADDRESS_KEYS = ["cep", "street", "number", "complement", "neighborhood", "city", "state", "reference"] as const;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function cleanAddress(v: unknown): Partial<QuoteAddress> | null {
  if (!v || typeof v !== "object") return null;
  const src = v as Record<string, unknown>;
  const out: Record<string, string | number> = {};
  for (const k of ADDRESS_KEYS) {
    const value = src[k];
    if (typeof value === "string") out[k] = value;
  }
  if (typeof src.latitude === "number" && Number.isFinite(src.latitude) && Math.abs(src.latitude) <= 90 && typeof src.longitude === "number" && Number.isFinite(src.longitude) && Math.abs(src.longitude) <= 180) { out.latitude = src.latitude; out.longitude = src.longitude; }
  return Object.keys(out).length ? (out as Partial<QuoteAddress>) : null;
}

function cleanMethod(v: unknown): PaymentMethod | null {
  return METHODS.includes(v as PaymentMethod) ? (v as PaymentMethod) : null;
}

function cleanChange(method: PaymentMethod | null, v: unknown): number | null {
  return method === "CASH" && typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null;
}

export function loadCustomer(): RememberedCustomer | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Record<string, unknown> | null;
    if (!v || typeof v !== "object") return null;
    const paymentMethod = cleanMethod(v.paymentMethod);
    return {
      ...(typeof v.buyerId === "string" && v.buyerId.length <= 100 ? { buyerId: v.buyerId } : {}),
      name: str(v.name),
      phone: str(v.phone),
      email: str(v.email),
      ...(isValidCpf(str(v.cpf)) ? { cpf: cpfDigits(str(v.cpf)) } : {}),
      address: cleanAddress(v.address),
      paymentMethod,
      ...(paymentMethod === "CARD_ONLINE" && (v.cardType === "CREDIT" || v.cardType === "DEBIT") ? { cardType: v.cardType } : {}),
      changeForCents: cleanChange(paymentMethod, v.changeForCents),
    };
  } catch {
    return null;
  }
}

export function saveCustomer(c: RememberedCustomer) {
  try {
    // Whitelisted fields only: nothing else (e.g. card data) can end up on the device by accident.
    const paymentMethod = cleanMethod(c.paymentMethod);
    const data: RememberedCustomer = {
      ...(typeof c.buyerId === "string" && c.buyerId.length <= 100 ? { buyerId: c.buyerId } : {}),
      name: str(c.name),
      phone: str(c.phone),
      email: str(c.email),
      ...(isValidCpf(str(c.cpf)) ? { cpf: cpfDigits(str(c.cpf)) } : {}),
      address: cleanAddress(c.address),
      paymentMethod,
      ...(paymentMethod === "CARD_ONLINE" && (c.cardType === "CREDIT" || c.cardType === "DEBIT") ? { cardType: c.cardType } : {}),
      changeForCents: cleanChange(paymentMethod, c.changeForCents),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private mode / quota: remembering is a convenience only.
  }
}

/** "Não é você?": forget everything remembered on this device. */
export function clearCustomer() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable: nothing was remembered either.
  }
}
