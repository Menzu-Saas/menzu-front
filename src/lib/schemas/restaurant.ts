import { z } from "zod";
import { isValidBrPhone, onlyDigits } from "@/lib/phone";

/** Same rule as the database (create_restaurant): 3–50 chars, a-z 0-9 and inner hyphens. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/;

export const slugSchema = z
  .string()
  .trim()
  .regex(SLUG_PATTERN, { error: "Use de 3 a 50 letras minúsculas, números ou hífen (sem hífen no início ou no fim)." });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Use no máximo ${max} caracteres.` })
    .optional()
    .transform((v) => (v ? v : undefined));

const requiredPhone = z
  .string({ error: "Informe o telefone." })
  .transform(onlyDigits)
  .refine(isValidBrPhone, { error: "Informe um telefone com DDD, ex.: (11) 98765-4321." });

const optionalPhone = z
  .string()
  .optional()
  .transform((v) => (v ? onlyDigits(v) : ""))
  .refine((v) => v === "" || isValidBrPhone(v), { error: "Informe um WhatsApp com DDD, ex.: (11) 98765-4321." })
  .transform((v) => v || undefined);

const MAX_CENTS = 10_000_000; // R$ 100.000,00

const cents = (required: string, negative: string) =>
  z
    .number({ error: required })
    .int({ error: required })
    .min(0, { error: negative })
    .max(MAX_CENTS, { error: "Valor muito alto." });

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const WEEKDAYS = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda-feira", short: "Seg" },
  { value: 2, label: "Terça-feira", short: "Ter" },
  { value: 3, label: "Quarta-feira", short: "Qua" },
  { value: 4, label: "Quinta-feira", short: "Qui" },
  { value: 5, label: "Sexta-feira", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
] as const;

/** One opening window; `closes_at < opens_at` means it crosses midnight (database convention). */
export const openingHourSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    opens_at: z.string().regex(TIME, { error: "Horário inválido." }),
    closes_at: z.string().regex(TIME, { error: "Horário inválido." }),
  })
  .refine((h) => h.opens_at !== h.closes_at, {
    error: "Abertura e fechamento não podem ser iguais.",
    path: ["closes_at"],
  });

const ORDER_TYPE_REQUIRED = {
  error: "Escolha pelo menos um tipo de pedido.",
  path: ["accepts_delivery"],
};
const hasOrderType = (v: { accepts_delivery: boolean; accepts_pickup: boolean; accepts_dine_in: boolean }) =>
  v.accepts_delivery || v.accepts_pickup || v.accepts_dine_in;

/** Step 1 — restaurante. */
export const restaurantBasicsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Informe o nome do restaurante." })
    .max(80, { error: "O nome deve ter no máximo 80 caracteres." }),
  slug: slugSchema,
  phone: requiredPhone,
  whatsapp: optionalPhone,
});

const operationShape = {
  address_cep: z
    .string()
    .optional()
    .transform((v) => (v ? onlyDigits(v) : ""))
    .refine((v) => v === "" || v.length === 8, { error: "O CEP deve ter 8 dígitos." })
    .transform((v) => v || undefined),
  address_street: optionalText(120),
  address_number: optionalText(20),
  address_complement: optionalText(80),
  address_neighborhood: optionalText(80),
  address_city: optionalText(80),
  address_state: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined))
    .refine((v) => v === undefined || /^[A-Z]{2}$/.test(v), { error: "Use a sigla do estado, ex.: SP." }),
  accepts_delivery: z.boolean(),
  accepts_pickup: z.boolean(),
  accepts_dine_in: z.boolean(),
  min_order_cents: cents("Informe o pedido mínimo.", "O pedido mínimo não pode ser negativo."),
  avg_prep_minutes: z
    .number({ error: "Informe o tempo médio." })
    .int({ error: "Informe o tempo médio em minutos." })
    .min(5, { error: "O tempo médio deve ser de pelo menos 5 minutos." })
    .max(240, { error: "O tempo médio deve ser de no máximo 240 minutos." }),
  default_delivery_fee_cents: cents("Informe a taxa de entrega.", "A taxa de entrega não pode ser negativa."),
};

/** Step 2 — endereço & operação. */
export const restaurantOperationSchema = z.object(operationShape).refine(hasOrderType, ORDER_TYPE_REQUIRED);

const hoursShape = {
  hours: z
    .array(openingHourSchema)
    .min(1, { error: "Abra o restaurante em pelo menos um dia da semana." })
    .refine((list) => new Set(list.map((h) => h.weekday)).size === list.length, {
      error: "Cada dia da semana só pode aparecer uma vez.",
    }),
};

/** Step 3 — horários. */
export const restaurantHoursSchema = z.object(hoursShape);

/** Whole onboarding payload (validated again on the server before calling `create_restaurant`). */
export const onboardingSchema = z
  .object({ ...restaurantBasicsSchema.shape, ...operationShape, ...hoursShape })
  .refine(hasOrderType, ORDER_TYPE_REQUIRED);

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingData = z.output<typeof onboardingSchema>;
