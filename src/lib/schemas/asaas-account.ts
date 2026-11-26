// Subaccount onboarding. The browser sends only identity and address; the server owns the key,
// the environment and the parent account. These legal data are forwarded to Asaas and never stored.
import { z } from "zod";
import { isValidCpf } from "@/lib/cpf";

const digits = (value: string) => value.replace(/\D/g, "");

export const asaasAccountSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome ou a razão social.").max(100, "Máximo de 100 caracteres."),
  email: z.string().trim().pipe(z.email("E-mail inválido.")),
  cpfCnpj: z.string().transform(digits).refine((v) => v.length === 11 || v.length === 14, "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)."),
  mobilePhone: z.string().transform(digits).refine((v) => /^\d{10,11}$/.test(v), "Telefone com DDD, 10 ou 11 dígitos."),
  /** Monthly revenue in cents. Asaas requires it for the account's risk analysis. */
  incomeCents: z.number({ error: "Informe o faturamento mensal." }).int().min(0, "Valor inválido.").max(100_000_000_00, "Valor inválido."),
  postalCode: z.string().transform(digits).refine((v) => v.length === 8, "CEP com 8 dígitos."),
  address: z.string().trim().min(1, "Informe a rua.").max(200),
  addressNumber: z.string().trim().min(1, "Informe o número.").max(20),
  province: z.string().trim().min(1, "Informe o bairro.").max(100),
  birthDate: z.union([z.literal(""), z.iso.date("Data inválida.")]).optional(),
  companyType: z.union([z.literal(""), z.enum(["MEI", "LIMITED", "INDIVIDUAL", "ASSOCIATION"])]).optional(),
}).superRefine((value, ctx) => {
  if (value.cpfCnpj.length === 11) {
    if (!isValidCpf(value.cpfCnpj)) ctx.addIssue({ code: "custom", path: ["cpfCnpj"], message: "CPF inválido." });
    if (!value.birthDate) ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Informe a data de nascimento." });
  } else if (!value.companyType) {
    ctx.addIssue({ code: "custom", path: ["companyType"], message: "Informe o tipo de empresa." });
  }
});

export type AsaasAccountInput = z.input<typeof asaasAccountSchema>;

export const COMPANY_TYPE_LABEL = {
  MEI: "MEI",
  LIMITED: "Empresa limitada (LTDA)",
  INDIVIDUAL: "Empresário individual",
  ASSOCIATION: "Associação",
} as const;
