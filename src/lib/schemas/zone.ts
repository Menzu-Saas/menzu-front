// Delivery zone editor payload (admin). restaurant_id/position are set by the server; RLS
// (OWNER/MANAGER) is the final authority. DISTANCE zones are not offered yet.
import { z } from "zod";
import { onlyDigits } from "@/lib/phone";
import { MANAGEMENT_ROLES } from "@/lib/roles";

/** Roles that manage delivery zones (catalog-style RLS: OWNER/MANAGER write). */
export const ZONE_ROLES = MANAGEMENT_ROLES;

/** Progressive CEP mask while typing: "01310100" → "01310-100". */
export function maskCep(raw: string): string {
  const d = onlyDigits(raw).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Splits free text ("Jardins, Jardim Paulista") into trimmed, de-duplicated neighbourhood names. */
export function splitNeighborhoods(raw: string): string[] {
  return dedupeNeighborhoods(raw.split(/[,;\n]/));
}

export function dedupeNeighborhoods(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const clean = name.replace(/\s+/g, " ").trim();
    const key = clean.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

const cep = z
  .string()
  .transform(onlyDigits)
  .pipe(z.string().length(8, "CEP inválido. Use o formato 00000-000."))
  .transform((d) => `${d.slice(0, 5)}-${d.slice(5)}`);

const money = (message: string) => z.number({ error: message }).int(message).min(0, message).max(100_000_000, message);

export const zoneSchema = z
  .object({
    name: z.string().trim().min(1, "Dê um nome para a zona.").max(80, "Máximo de 80 caracteres."),
    type: z.enum(["NEIGHBORHOOD", "CEP_RANGE"], { error: "Escolha como a zona é definida." }),
    neighborhoods: z.array(z.string().max(80, "Nome de bairro muito longo.")).max(100, "Máximo de 100 bairros.").default([]),
    city: z.string().trim().nullable().optional(),
    state: z.string().trim().toUpperCase().nullable().optional(),
    cep_start: z.string().nullable().optional(),
    cep_end: z.string().nullable().optional(),
    fee_cents: money("Informe a taxa de entrega."),
    min_order_cents: money("Valor inválido.").nullable(),
    est_minutes: z
      .number({ error: "Informe os minutos." })
      .int("Informe minutos inteiros.")
      .min(1, "Informe ao menos 1 minuto.")
      .max(600, "Máximo de 600 minutos.")
      .nullable(),
    is_active: z.boolean(),
  })
  .strip()
  .transform((z0, ctx) => {
    if (z0.type === "NEIGHBORHOOD") {
      if (z0.city && z0.city.length > 120) {
        ctx.addIssue({ code: "custom", path: ["city"], message: "Máximo de 120 caracteres." });
        return z.NEVER;
      }
      if (z0.state && !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(z0.state)) {
        ctx.addIssue({ code: "custom", path: ["state"], message: "Informe uma UF válida." });
        return z.NEVER;
      }
      const neighborhoods = dedupeNeighborhoods(z0.neighborhoods);
      if (neighborhoods.length === 0) {
        ctx.addIssue({ code: "custom", path: ["neighborhoods"], message: "Adicione pelo menos um bairro." });
        return z.NEVER;
      }
      return { ...z0, neighborhoods, city: z0.city === undefined ? undefined : z0.city?.trim() || null, state: z0.state === undefined ? undefined : z0.state || null, cep_start: null, cep_end: null };
    }
    const start = cep.safeParse(z0.cep_start ?? "");
    const end = cep.safeParse(z0.cep_end ?? "");
    if (!start.success) ctx.addIssue({ code: "custom", path: ["cep_start"], message: start.error.issues[0].message });
    if (!end.success) ctx.addIssue({ code: "custom", path: ["cep_end"], message: end.error.issues[0].message });
    if (!start.success || !end.success) return z.NEVER;
    if (start.data > end.data) {
      ctx.addIssue({ code: "custom", path: ["cep_end"], message: "O CEP final deve ser maior ou igual ao inicial." });
      return z.NEVER;
    }
    return { ...z0, neighborhoods: [], city: null, state: null, cep_start: start.data, cep_end: end.data };
  });

export type ZoneInput = z.input<typeof zoneSchema>;
export type ZoneValues = z.output<typeof zoneSchema>;
