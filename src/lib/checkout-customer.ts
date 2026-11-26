import { z } from "zod";
import { checkoutAddressSchema, type CheckoutAddress } from "@/components/checkout/checkout-preferences";

export interface CheckoutCustomer {
  name: string;
  phone: string;
  email: string;
  address: CheckoutAddress | null;
}

const name = z.string().trim().min(1).max(80);
const phone = z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().regex(/^\d{10,11}$/));

/** Orders passed here must also be filtered by buyer_user_id in the server query. */
export function checkoutCustomer(
  user: { id: string; email?: string },
  profile: { full_name: string | null; phone: string | null } | null,
  order: { buyer_user_id: string | null; customer_name: string; customer_phone: string; address: unknown } | null,
): CheckoutCustomer {
  const own = order?.buyer_user_id === user.id ? order : null;
  const address = checkoutAddressSchema.safeParse(own?.address);
  return {
    name: name.safeParse(own?.customer_name).data ?? name.safeParse(profile?.full_name).data ?? "",
    phone: phone.safeParse(own?.customer_phone).data ?? phone.safeParse(profile?.phone).data ?? "",
    email: z.email().max(120).safeParse(user.email).data ?? "",
    address: address.success ? address.data : null,
  };
}
