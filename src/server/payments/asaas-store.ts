import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AsaasClient } from "./asaas-client";
import { asaasEnvironment, decryptAsaasKey } from "./asaas-security";

/** New integration tables have no browser grants. Never export this client to actions. */
export function asaasStore() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ASAAS_STORAGE_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Call only after server-side restaurant authorization. */
export async function restaurantAsaasClient(restaurantId: string): Promise<AsaasClient | null> {
  z.uuid().parse(restaurantId);
  const environment = asaasEnvironment();
  const { data, error } = await asaasStore().from("asaas_accounts")
    .select("encrypted_api_key").eq("restaurant_id", restaurantId).eq("environment", environment).maybeSingle();
  if (error) throw new Error("ASAAS_STORAGE_UNAVAILABLE");
  if (!data) return null;
  return new AsaasClient(decryptAsaasKey(z.string().parse(data.encrypted_api_key), `${restaurantId}:${environment}`), environment);
}


