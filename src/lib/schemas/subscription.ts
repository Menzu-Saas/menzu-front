import { z } from "zod";
import { isValidCpf } from "@/lib/cpf";

const digits = (v: string) => v.replace(/\D/g, "");

/** Billing details for the monthly plan. Sent to Asaas, never stored by Menzu. */
export const subscribeSchema = z.object({
  planSlug: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2, "Informe o nome ou a razão social.").max(100),
  email: z.string().trim().pipe(z.email("E-mail inválido.")),
  cpfCnpj: z.string().transform(digits).refine((v) => (v.length === 11 && isValidCpf(v)) || v.length === 14, "Informe um CPF ou CNPJ válido."),
});
export type SubscribeInput = z.input<typeof subscribeSchema>;
