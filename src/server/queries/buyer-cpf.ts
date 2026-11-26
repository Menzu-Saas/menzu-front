import "server-only";
import { getSessionUser } from "@/server/auth";
import { getBuyerCpfLast3 } from "@/server/payments/cpf-vault";

/** Para a tela de checkout: o comprador logado já tem CPF salvo? Devolve só os 3 últimos dígitos. */
export async function buyerCpfStatus(): Promise<{ signedIn: boolean; last3: string | null }> {
  const user = await getSessionUser();
  if (!user) return { signedIn: false, last3: null };
  try {
    return { signedIn: true, last3: await getBuyerCpfLast3(user.id) };
  } catch {
    return { signedIn: true, last3: null };
  }
}
