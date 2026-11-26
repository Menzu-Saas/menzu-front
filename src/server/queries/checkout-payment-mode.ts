import "server-only";
import { asaasEnvironment } from "@/server/payments/asaas-security";
import { asaasStore } from "@/server/payments/asaas-store";
import { getPublicPaymentMode, type PublicPaymentMode } from "@/server/queries/public-menu";

const CLOSED: PublicPaymentMode = { provider: "development", onlineAvailable: false, emailRequiredForPix: false };

/** O restaurante já tem subconta Asaas neste ambiente? Sem ela não há quem emita a cobrança. */
async function hasAsaasAccount(restaurantId: string): Promise<boolean> {
  const { data, error } = await asaasStore().from("asaas_accounts").select("restaurant_id")
    .eq("restaurant_id", restaurantId).eq("environment", asaasEnvironment()).maybeSingle();
  return !error && Boolean(data);
}

/**
 * Modo de pagamento do checkout. Pix e cartão só aparecem quando TUDO está pronto: Asaas escolhido
 * no servidor, liberado no banco e com subconta do restaurante. Qualquer falha mantém o online
 * trancado ("Indisponível no momento"), porque um pedido criado sem conseguir cobrar é pior.
 */
export async function checkoutPaymentMode(restaurantId: string): Promise<PublicPaymentMode> {
  try {
    const mode = await getPublicPaymentMode();
    // Fora do Asaas o online continua fechado na BETA (mesma regra de parseOrderPayload).
    if (mode.provider !== "asaas" || !mode.onlineAvailable) return { ...mode, onlineAvailable: false };
    return { ...mode, onlineAvailable: await hasAsaasAccount(restaurantId) };
  } catch {
    return CLOSED;
  }
}
