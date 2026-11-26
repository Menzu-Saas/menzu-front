import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { checkoutAddressSchema } from "@/components/checkout/checkout-preferences";
import { checkoutCustomer, type CheckoutCustomer } from "@/lib/checkout-customer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/server/auth";

export async function getCheckoutCustomer(): Promise<CheckoutCustomer | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const db = await createSupabaseServerClient();
  const [profile, latest, delivery, saved] = await Promise.all([
    db.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
    db.from("orders").select("buyer_user_id,customer_name,customer_phone,address").eq("buyer_user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("orders").select("buyer_user_id,customer_name,customer_phone,address").eq("buyer_user_id", user.id).eq("type", "DELIVERY").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    (db as SupabaseClient).from("buyer_delivery_addresses").select("address").eq("user_id",user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const customer = checkoutCustomer(user, profile.data, latest.data);
  const remembered = checkoutAddressSchema.safeParse(saved.data?.address);
  customer.address = remembered.success ? remembered.data : checkoutCustomer(user, null, delivery.data).address;
  return customer;
}
