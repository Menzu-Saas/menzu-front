import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import type { PublicCoupon } from "@/lib/schemas/coupon";

const row = z.object({
  code: z.string(),
  description: z.string().nullable(),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int(),
  min_order_cents: z.number().int(),
  max_discount_cents: z.number().int().nullable(),
  ends_at: z.string().nullable(),
  per_customer_limit: z.number().int().nullable(),
});

/** Coupons the restaurant marked as public. Anonymous read through a database function: never the table. */
export async function getPublicCoupons(slug: string): Promise<PublicCoupon[]> {
  const client = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.rpc("public_coupons", { p_slug: slug });
  if (error) return []; // The list is a convenience; the code field keeps working.
  const parsed = z.array(row).safeParse(data);
  return parsed.success ? parsed.data : [];
}
