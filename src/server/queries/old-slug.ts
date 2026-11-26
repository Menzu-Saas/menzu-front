import "server-only";
import { createClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { SLUG_PATTERN } from "@/lib/schemas/restaurant";
import type { Database } from "@/lib/supabase/database.types";

type Query = Record<string, string | string[] | undefined>;

/**
 * Chamado quando o cardápio não existe: se o endereço já foi de um restaurante, leva ao endereço atual
 * (links e QR Codes antigos continuam valendo). Redirecionamento temporário, porque o nome pode mudar de novo.
 */
export async function redirectOldSlug(slug: string, page = "", query: Query = {}): Promise<never> {
  const client = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.rpc("resolve_old_slug", { p_slug: slug });
  if (error || typeof data !== "string" || data === slug || !SLUG_PATTERN.test(data)) notFound();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of [value].flat()) if (item !== undefined) params.append(key, item);
  }
  const search = params.size ? `?${params}` : "";
  redirect(`/cardapio/${data}${page}${search}`);
}
