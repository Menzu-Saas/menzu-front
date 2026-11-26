"use client";

import { useEffect, useState } from "react";
import { loadCustomer, type RememberedCustomer } from "@/components/checkout/customer-storage";
import { cartEstimate, useCart } from "@/stores/cart";
import { belowMinimumMissingCents, buildQuotePayload, useQuote, type QuoteAddress } from "./use-quote";

/**
 * Server quote for the cart as it stands (menu side cart and /carrinho). Uses the phone/address
 * remembered from a previous checkout, if any, so the fee and per-customer coupon limits are real.
 */
export function useCartQuote(slug: string, acceptsPickup: boolean, minOrderCents = 0) {
  const cart = useCart(slug);
  const [customer, setCustomer] = useState<RememberedCustomer | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
  useEffect(() => setCustomer(loadCustomer()), []);

  const built = cart.hydrated
    ? buildQuotePayload({
        slug,
        items: cart.items,
        type: cart.type,
        tableNumber: cart.tableNumber,
        couponCode: cart.couponCode,
        phone: customer?.phone,
        address: (customer?.address as Partial<QuoteAddress> | null) ?? null,
        acceptsPickup,
      })
    : null;
  const q = useQuote(built?.payload ?? null);
  const current = q.key === q.currentKey && !q.loading;
  const quote = current ? q.quote : null;
  const estimate = cartEstimate(cart.items);
  const error = current ? q.error : null;
  const missing = minOrderCents - (quote?.subtotal_cents ?? estimate);
  return {
    cart,
    quote,
    /** The quote answers the current cart (line totals can be trusted). */
    fresh: Boolean(quote),
    error,
    loading: !current,
    deliveryPending: built?.deliveryPending ?? cart.type === "DELIVERY",
    /**
     * Delivery-only restaurant and no saved address yet: the server cannot price the cart before the
     * checkout collects the address, so the cart shows the local estimate. The known restaurant
     * minimum still applies; checkout requires the address and a real DELIVERY quote to confirm.
     */
    estimateOnly: cart.hydrated && cart.items.length > 0 && cart.type === "DELIVERY" && !built,
    estimateCents: estimate,
    quoteCoupon: current ? ((built?.payload.coupon_code as string | undefined) ?? null) : null,
    missingCents: belowMinimumMissingCents(error, estimate) ?? (missing > 0 ? missing : null),
    retry: q.retry,
    retrying: q.retrying,
  };
}
