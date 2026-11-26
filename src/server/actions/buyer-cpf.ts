"use server";

import { cpfSchema } from "@/lib/schemas/auth";
import { getSessionUser } from "@/server/auth";
import { saveBuyerCpf } from "@/server/payments/cpf-vault";

export type BuyerCpfResult = { ok: true; last3: string } | { ok: false; error: string };

/**
 * Salva o CPF do comprador logado, cifrado. Recebe FormData (e não um objeto) para que o CPF nunca
 * apareça nos logs de Server Function do `next dev`. O usuário vem da sessão, nunca do navegador.
 */
export async function saveBuyerCpfAction(form: FormData): Promise<BuyerCpfResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Entre na sua conta para salvar o CPF." };
  const raw = form.get("cpf");
  const parsed = cpfSchema.safeParse(typeof raw === "string" ? raw : "");
  if (!parsed.success) return { ok: false, error: "Informe um CPF válido." };
  try {
    await saveBuyerCpf(user.id, parsed.data);
    return { ok: true, last3: parsed.data.slice(-3) };
  } catch (e) {
    console.error("[buyer-cpf] não foi possível salvar o CPF", e instanceof Error ? e.message : "erro");
    return { ok: false, error: "Não foi possível salvar o CPF agora. Tente novamente." };
  }
}
