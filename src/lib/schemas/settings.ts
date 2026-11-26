import { z } from "zod";
import { MEMBER_ROLES } from "@/lib/order-status";
import { isValidBrPhone, onlyDigits } from "@/lib/phone";
import { emailSchema } from "./auth";
import { slugSchema } from "./restaurant";

export { SLUG_PATTERN, slugSchema } from "./restaurant";

/** Same rule as restaurants.primary_color: "#RRGGBB". */
export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Accent presets for the public menu header (Menzu brand family). These are data — the restaurant's
 * stored colour — not UI styles, so they are exempt from the hardcoded-style check.
 */
export const BRAND_SWATCHES = [
  { value: "#FF6B1A", label: "Laranja Menzu" }, // mz-allow-hardcoded
  { value: "#E2540A", label: "Laranja queimado" }, // mz-allow-hardcoded
  { value: "#FF8A3D", label: "Damasco" }, // mz-allow-hardcoded
  { value: "#C2410C", label: "Telha" }, // mz-allow-hardcoded
  { value: "#B26A00", label: "Mostarda" }, // mz-allow-hardcoded
  { value: "#12A150", label: "Verde" }, // mz-allow-hardcoded
  { value: "#1A1614", label: "Grafite" }, // mz-allow-hardcoded
] as const;

const MAX_CENTS = 10_000_000; // R$ 100.000,00

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Use no máximo ${max} caracteres.` })
    .optional()
    .transform((v) => (v ? v : null));

const phone = (label: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? onlyDigits(v) : ""))
    .refine((v) => v === "" || isValidBrPhone(v), { error: `Informe um ${label} com DDD, ex.: (11) 98765-4321.` })
    .transform((v) => v || null);

/** "@burgerhouse", "instagram.com/burgerhouse/" or "burgerhouse" → "burgerhouse". */
export function normalizeInstagram(value: string): string {
  return value
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

export const hexColorSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR, { error: "Use uma cor no formato #RRGGBB, ex.: #FF6B1A." })
  .transform((v) => v.toUpperCase());

/** Perfil da loja. */
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Informe o nome do restaurante." })
    .max(80, { error: "O nome deve ter no máximo 80 caracteres." }),
  description: optionalText(500),
  phone: z
    .string({ error: "Informe o telefone." })
    .transform(onlyDigits)
    .refine(isValidBrPhone, { error: "Informe um telefone com DDD, ex.: (11) 98765-4321." }),
  whatsapp: phone("WhatsApp"),
  instagram: z
    .string()
    .optional()
    .transform((v) => (v ? normalizeInstagram(v) : ""))
    .refine((v) => v === "" || /^[A-Za-z0-9._]{1,30}$/.test(v), {
      error: "Informe só o usuário do Instagram, ex.: @burgerhouse.",
    })
    // Stored as "@handle" (same convention as the seed data).
    .transform((v) => (v ? `@${v}` : null)),
  slug: slugSchema,
  primary_color: z.union([hexColorSchema, z.null()]),
});

/** Endereço. */
export const addressSchema = z.object({
  address_cep: z
    .string()
    .optional()
    .transform((v) => (v ? onlyDigits(v) : ""))
    .refine((v) => v === "" || v.length === 8, { error: "O CEP deve ter 8 dígitos." })
    .transform((v) => (v ? `${v.slice(0, 5)}-${v.slice(5)}` : null)),
  address_street: optionalText(120),
  address_number: optionalText(20),
  address_complement: optionalText(80),
  address_neighborhood: optionalText(80),
  address_city: optionalText(80),
  address_state: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null))
    .refine((v) => v === null || /^[A-Z]{2}$/.test(v), { error: "Use a sigla do estado, ex.: SP." }),
});

const cents = (required: string, negative: string) =>
  z
    .number({ error: required })
    .int({ error: required })
    .min(0, { error: negative })
    .max(MAX_CENTS, { error: "Valor muito alto." });

/** Operação: valores, tempo e tipos de pedido. */
export const operationSchema = z
  .object({
    min_order_cents: cents("Informe o pedido mínimo.", "O pedido mínimo não pode ser negativo."),
    avg_prep_minutes: z
      .number({ error: "Informe o tempo médio." })
      .int({ error: "Informe o tempo médio em minutos." })
      .min(5, { error: "O tempo médio deve ser de pelo menos 5 minutos." })
      .max(240, { error: "O tempo médio deve ser de no máximo 240 minutos." }),
    default_delivery_fee_cents: cents("Informe a taxa de entrega.", "A taxa de entrega não pode ser negativa."),
    accepts_delivery: z.boolean(),
    accepts_pickup: z.boolean(),
    accepts_dine_in: z.boolean(),
    accepts_scheduling: z.boolean(),
  })
  .refine((v) => v.accepts_delivery || v.accepts_pickup || v.accepts_dine_in, {
    error: "Mantenha pelo menos um tipo de pedido ativo.",
    path: ["accepts_delivery"],
  });

export const PAYMENT_METHODS = ["PIX", "CARD_ONLINE", "CASH"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodValue | "CARD_ON_DELIVERY", string> = {
  PIX: "Pix",
  CARD_ONLINE: "Cartão de crédito e débito na compra",
  CARD_ON_DELIVERY: "Cartão na entrega",
  CASH: "Dinheiro",
};

/** Pagamentos aceitos. */
export const paymentsSchema = z.object({
  payment_methods: z
    .array(z.enum(PAYMENT_METHODS))
    .min(1, { error: "Aceite pelo menos uma forma de pagamento." })
    .transform((list) => PAYMENT_METHODS.filter((m) => list.includes(m))),
});

const TIME = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
export const MAX_INTERVALS_PER_DAY = 4;

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) + Number(t.slice(6, 8) || 0) / 60;

export const hourIntervalSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    opens_at: z.string().regex(TIME, { error: "Horário inválido." }),
    closes_at: z.string().regex(TIME, { error: "Horário inválido." }),
  })
  .refine((h) => toMinutes(h.opens_at) !== toMinutes(h.closes_at), {
    error: "Abertura e fechamento não podem ser iguais.",
    path: ["closes_at"],
  });

export type HourInterval = z.infer<typeof hourIntervalSchema>;

const WEEK = 7 * 1440;

/** Interval as [start, end) minutes in the week; crossing midnight runs into the next day. */
function weekSpan(h: HourInterval): [number, number] {
  const open = toMinutes(h.opens_at);
  const close = toMinutes(h.closes_at);
  const start = h.weekday * 1440 + open;
  return [start, start + (close > open ? close - open : 1440 - open + close)];
}

/** Index pairs of intervals that overlap (also across midnight and Saturday → Sunday). */
export function overlappingIntervals(list: readonly HourInterval[]): [number, number][] {
  const spans = list.map(weekSpan);
  const out: [number, number][] = [];
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const [a1, a2] = spans[i];
      for (const shift of [-WEEK, 0, WEEK]) {
        const b1 = spans[j][0] + shift;
        const b2 = spans[j][1] + shift;
        if (a1 < b2 && b1 < a2) {
          out.push([i, j]);
          break;
        }
      }
    }
  }
  return out;
}

/** Horários: any number of intervals per weekday (none = fechado). */
export const hoursSchema = z
  .object({ hours: z.array(hourIntervalSchema).max(7 * MAX_INTERVALS_PER_DAY) })
  .superRefine(({ hours }, ctx) => {
    for (let d = 0; d < 7; d++) {
      if (hours.filter((h) => h.weekday === d).length > MAX_INTERVALS_PER_DAY) {
        ctx.addIssue({ code: "custom", message: `Use no máximo ${MAX_INTERVALS_PER_DAY} horários por dia.`, path: ["hours"] });
        return;
      }
    }
    for (const [, j] of overlappingIntervals(hours)) {
      ctx.addIssue({ code: "custom", message: "Este horário se sobrepõe a outro.", path: ["hours", j, "opens_at"] });
    }
  });

/** Mesa (QR Code). */
export const tableSchema = z.object({
  number: z
    .number({ error: "Informe o número da mesa." })
    .int({ error: "Use um número inteiro." })
    .min(1, { error: "O número da mesa deve ser de 1 a 9999." })
    .max(9999, { error: "O número da mesa deve ser de 1 a 9999." }),
  label: optionalText(40),
});

export const memberRoleSchema = z.enum(MEMBER_ROLES, { error: "Escolha um papel." });

/** Convidar membro. */
export const inviteSchema = z.object({ email: emailSchema, role: memberRoleSchema });

export type ProfileInput = z.input<typeof profileSchema>;
export type AddressInput = z.input<typeof addressSchema>;
export type OperationInput = z.input<typeof operationSchema>;
export type PaymentsInput = z.input<typeof paymentsSchema>;
export type HoursInput = z.input<typeof hoursSchema>;
export type TableInput = z.input<typeof tableSchema>;
export type InviteInput = z.input<typeof inviteSchema>;
