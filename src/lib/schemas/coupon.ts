// Coupon editor payload (admin). The browser sends the coupon definition only; restaurant_id and
// used_count are set by the server, and RLS (OWNER/MANAGER) is the final authority.
import { z } from "zod";
import { formatMoney } from "@/lib/money";
import { MANAGEMENT_ROLES } from "@/lib/roles";
import type { CouponType } from "@/lib/types";

/** Roles that manage coupons (RLS: OWNER/MANAGER write; ATTENDANT can only read, so no page). */
export const COUPON_ROLES = MANAGEMENT_ROLES;

export const COUPON_CODE_RE = /^[A-Z0-9]{3,20}$/;

/** Upper-cases and drops anything outside A–Z/0–9 (used while typing the code). */
export function normalizeCouponCode(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
}

const optionalPositiveInt = (message: string) =>
  z.number({ error: message }).int(message).positive(message).max(1_000_000, message).nullable();

const isoOrNull = z
  .union([z.literal(""), z.iso.datetime({ offset: true, error: "Data inválida." }), z.null()])
  .transform((v) => (v ? v : null));

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .pipe(z.string().regex(COUPON_CODE_RE, "Use de 3 a 20 letras (A–Z) ou números, sem espaços.")),
    description: z
      .string()
      .trim()
      .max(120, "Máximo de 120 caracteres.")
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
    type: z.enum(["PERCENT", "FIXED"], { error: "Escolha o tipo do desconto." }),
    value: z.number({ error: "Informe o valor do desconto." }).int("Informe um valor inteiro."),
    min_order_cents: z.number().int().min(0, "Valor inválido.").max(100_000_000, "Valor inválido."),
    max_discount_cents: optionalPositiveInt("Informe um valor maior que zero."),
    starts_at: isoOrNull,
    ends_at: isoOrNull,
    usage_limit: optionalPositiveInt("Informe um número inteiro maior que zero."),
    per_customer_limit: optionalPositiveInt("Informe um número inteiro maior que zero."),
    is_active: z.boolean(),
    /** Shown in the checkout coupon list. Off = the customer needs to know the code. */
    is_public: z.boolean().default(false),
  })
  .strip()
  .superRefine((c, ctx) => {
    if (c.type === "PERCENT" && (c.value < 1 || c.value > 100)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "O percentual deve ficar entre 1% e 100%." });
    }
    if (c.type === "FIXED" && (c.value < 1 || c.value > 100_000_000)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Informe um valor maior que zero." });
    }
    if (c.starts_at && c.ends_at && new Date(c.ends_at) <= new Date(c.starts_at)) {
      ctx.addIssue({ code: "custom", path: ["ends_at"], message: "O fim deve ser depois do início." });
    }
    if (c.usage_limit != null && c.per_customer_limit != null && c.per_customer_limit > c.usage_limit) {
      ctx.addIssue({
        code: "custom",
        path: ["per_customer_limit"],
        message: "Não pode ser maior que o limite total.",
      });
    }
  })
  // "Desconto máximo" only applies to percentages.
  .transform((c) => (c.type === "FIXED" ? { ...c, max_discount_cents: null } : c));

export type CouponInput = z.input<typeof couponSchema>;
export type CouponValues = z.output<typeof couponSchema>;

export const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  PERCENT: "Percentual",
  FIXED: "Valor fixo",
};

/** "R$ 25" for whole reais, "R$ 25,90" otherwise (campaign cards, rules line). */
export function formatMoneyCompact(cents: number): string {
  const full = formatMoney(cents);
  return cents % 100 === 0 ? full.replace(/,00$/, "") : full;
}

export interface CouponLike {
  type: CouponType;
  value: number;
  min_order_cents: number;
  max_discount_cents: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  used_count: number;
  is_active: boolean;
  is_public?: boolean;
}

/** Coupon as the checkout list receives it (public_coupons RPC). */
export interface PublicCoupon {
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  min_order_cents: number;
  max_discount_cents: number | null;
  ends_at: string | null;
  per_customer_limit: number | null;
}

/** Why a public coupon cannot be applied to the current cart, or null when it can. */
export function publicCouponBlock(c: Pick<PublicCoupon, "min_order_cents">, subtotalCents: number): string | null {
  if (c.min_order_cents > subtotalCents) return `Pedido mínimo de ${formatMoneyCompact(c.min_order_cents)}`;
  return null;
}

/** Headline value: "20% OFF" / "R$ 5 OFF". */
export function couponHeadline(c: Pick<CouponLike, "type" | "value">): string {
  return c.type === "PERCENT" ? `${c.value}% OFF` : `${formatMoneyCompact(c.value)} OFF`;
}

/** Table value: "20%" / "R$ 5,00". */
export function couponValueLabel(c: Pick<CouponLike, "type" | "value">): string {
  return c.type === "PERCENT" ? `${c.value}%` : formatMoney(c.value);
}

/** Rules line under a campaign card, e.g. "1 por cliente · mín. R$ 25 · 84 usos". */
export function couponRulesLine(c: CouponLike): string {
  const parts: string[] = [];
  if (c.per_customer_limit != null) parts.push(`${c.per_customer_limit} por cliente`);
  if (c.min_order_cents > 0) parts.push(`mín. ${formatMoneyCompact(c.min_order_cents)}`);
  if (c.type === "PERCENT" && c.max_discount_cents != null) parts.push(`máx. ${formatMoneyCompact(c.max_discount_cents)}`);
  const uses = c.used_count === 1 ? "1 uso" : `${c.used_count} usos`;
  parts.push(c.usage_limit != null ? `${uses} de ${c.usage_limit}` : uses);
  return parts.join(" · ");
}

export type CouponState = "ACTIVE" | "PAUSED" | "SCHEDULED" | "EXPIRED" | "EXHAUSTED";

/** Effective state at `now` (what a customer would experience at checkout). */
export function couponState(c: CouponLike, now: Date = new Date()): CouponState {
  if (!c.is_active) return "PAUSED";
  if (c.ends_at && new Date(c.ends_at) <= now) return "EXPIRED";
  if (c.usage_limit != null && c.used_count >= c.usage_limit) return "EXHAUSTED";
  if (c.starts_at && new Date(c.starts_at) > now) return "SCHEDULED";
  return "ACTIVE";
}

export const COUPON_STATE_BADGE: Record<CouponState, { label: string; tone: "success" | "neutral" | "info" | "warning" }> = {
  ACTIVE: { label: "ATIVO", tone: "success" },
  PAUSED: { label: "PAUSADO", tone: "neutral" },
  SCHEDULED: { label: "AGENDADO", tone: "info" },
  EXPIRED: { label: "EXPIRADO", tone: "neutral" },
  EXHAUSTED: { label: "ESGOTADO", tone: "warning" },
};
