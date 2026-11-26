import { z } from "zod";
import { isValidCpf } from "@/lib/cpf";

export const PASSWORD_MIN = 8;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Informe um e-mail válido." }));

const newPassword = z
  .string()
  .min(PASSWORD_MIN, { error: `A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.` })
  .max(72, { error: "A senha deve ter no máximo 72 caracteres." });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Informe sua senha." }),
});

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Informe seu nome." })
    .max(80, { error: "O nome deve ter no máximo 80 caracteres." }),
  email: emailSchema,
  password: newPassword,
});

/** CPF exigido no cadastro feito a partir do checkout do comprador (necessário para cobranças Pix). */
export const cpfSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine(isValidCpf, { error: "Informe um CPF válido." });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { error: "As senhas não conferem.", path: ["confirm"] });

export type LoginInput = z.input<typeof loginSchema>;
export type SignupInput = z.input<typeof signupSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

/** Field name → first error message. */
export type FieldErrors = Record<string, string>;

/** Flattens a ZodError into `{ "path.joined.by.dots": firstMessage }` ("_form" for root-level issues). */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
