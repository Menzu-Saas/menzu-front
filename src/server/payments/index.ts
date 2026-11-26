import "server-only";
import { resolveAppOrigin } from "@/lib/app-origin";
import { AsaasProvider } from "./asaas-provider";
import { asaasStore, restaurantAsaasClient } from "./asaas-store";
import { DevelopmentPaymentProvider } from "./development";
import { MercadoPagoProvider } from "./mercadopago";
import type { PaymentProvider } from "./types";

export * from "./types";
export { isOfflineMethod, isOnlineMethod, OFFLINE_PROVIDER } from "./offline";

type Env = Record<string, string | undefined>;

function value(env: Env, key: string): string | undefined {
  const v = env[key]?.trim();
  return v ? v : undefined;
}

/** True when Mercado Pago credentials are configured (production payments). */
export function isMercadoPagoConfigured(env: Env = process.env): boolean {
  return value(env, "MERCADOPAGO_ACCESS_TOKEN") !== undefined;
}

/**
 * Development payments are only possible outside production and without Mercado Pago.
 * The database adds a second gate (`menzu_settings.allow_development_payments`).
 */
export function isDevelopmentPaymentsEnabled(env: Env = process.env): boolean {
  return env.NODE_ENV !== "production" && !isMercadoPagoConfigured(env);
}

/** Opt-in switch: nothing changes until `MENZU_ONLINE_PROVIDER=asaas` and the wallet are configured. */
export function isAsaasSelected(env: Env = process.env): boolean {
  return value(env, "MENZU_ONLINE_PROVIDER") === "asaas" && value(env, "ASAAS_PLATFORM_WALLET_ID") !== undefined;
}

/** AsaasProvider when selected, MercadoPagoProvider when MERCADOPAGO_ACCESS_TOKEN is set, otherwise development. */
export function getPaymentProvider(env: Env = process.env): PaymentProvider {
  if (isAsaasSelected(env)) {
    return new AsaasProvider({
      platformWalletId: value(env, "ASAAS_PLATFORM_WALLET_ID")!,
      clientFor: restaurantAsaasClient,
      loadPayment: async (paymentId) => {
        const { data, error } = await asaasStore().from("payments").select("restaurant_id,amount_cents").eq("id", paymentId).maybeSingle();
        if (error || !data) return null;
        return { restaurantId: data.restaurant_id as string, amountCents: data.amount_cents as number };
      },
    });
  }
  const accessToken = value(env, "MERCADOPAGO_ACCESS_TOKEN");
  if (accessToken) {
    return new MercadoPagoProvider({
      accessToken,
      webhookSecret: value(env, "MERCADOPAGO_WEBHOOK_SECRET"),
      // Same rule as appUrl(): production must configure the public URL (notification_url, back_urls).
      appUrl: resolveAppOrigin({ configured: value(env, "APP_URL"), nodeEnv: env.NODE_ENV, header: () => null }),
      defaultPayerEmail: value(env, "MERCADOPAGO_DEFAULT_PAYER_EMAIL"),
    });
  }
  return new DevelopmentPaymentProvider();
}



