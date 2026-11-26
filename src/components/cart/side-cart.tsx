"use client";

import { cartCount } from "@/stores/cart";
import { customerCheckoutHref } from "@/lib/customer-checkout";

import Link from "next/link";
import { BottomSheet, Button, Drawer } from "@/components/ui";
import type { PublicMenu, PublicProduct, PublicRestaurant } from "@/server/queries/public-menu";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import type { CartLine } from "@/stores/cart";
import { ADDRESS_HINT, CartMinimum, CouponBox, QuoteBreakdown, SideCartLineRow } from "./cart-parts";
import { CartUndo } from "./cart-undo";
import { CartEmpty } from "./cart-empty";
import { CartSuggestions } from "./cart-suggestions";
import type { CartRemoval } from "./use-cart-removal";
import type { useCartQuote } from "./use-cart-quote";
import { canGoToCheckout } from "./use-quote";
import { cartLineIssue } from "./cart-availability";

/** Menu bag with the same responsive panel as the storefront. */
export function SideCart({
  open,
  onOpenChange,
  restaurant,
  data,
  blocked,
  scheduleOnly = false,
  onEdit,
  quoted,
  removal,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: PublicRestaurant;
  data: PublicMenu;
  blocked: boolean;
  /** Closed now but accepts scheduling: the CTA becomes "Agendar pedido". */
  scheduleOnly?: boolean;
  onEdit: (line: CartLine) => void;
  quoted: ReturnType<typeof useCartQuote>;
  removal: CartRemoval;
  onChoose: (product: PublicProduct) => void;
}) {
  const { cart, quote, fresh, error, loading, deliveryPending, estimateOnly, estimateCents, quoteCoupon, missingCents, retry, retrying } =
    quoted;
  const Panel = useMediaQuery("(min-width: 768px)") ? Drawer : BottomSheet;
  const empty = cart.hydrated && cart.items.length === 0;
  const products = new Map(data.menus.flatMap((m) => m.categories.flatMap((c) => c.products.map((p) => [p.id, p] as const))));
  // Same rule as the mobile cart: the CTA only navigates to checkout, which re-quotes before confirming.
  const canCheckout = canGoToCheckout({
    hasItems: cart.hydrated && !empty,
    blocked: blocked || cart.items.some((line) => cartLineIssue(line, products.get(line.productId)) !== null),
    loading,
    hasQuote: Boolean(quote),
    estimateOnly,
    error,
    missingCents,
  });
  const menu = `/cardapio/${restaurant.slug}${cart.type === "DINE_IN" && cart.tableNumber ? `?table=${cart.tableNumber}` : ""}`;

  return (
    <Panel open={open} onOpenChange={onOpenChange} title={`Sua sacola · ${cartCount(cart.items)} ${cartCount(cart.items) === 1 ? "item" : "itens"}`} footer={
      cart.hydrated && (empty
        ? <Button block variant="outline" onClick={() => onOpenChange(false)}>Continuar explorando</Button>
        : canCheckout ? (
            <Button asChild size="lg" block className="shadow-cta">
              <Link href={customerCheckoutHref(restaurant.slug)} onClick={() => onOpenChange(false)}>
                {scheduleOnly ? "Agendar pedido" : "Finalizar pedido"}
              </Link>
            </Button>
          ) : (
            <Button size="lg" block disabled>
              {scheduleOnly ? "Agendar pedido" : "Finalizar pedido"}
            </Button>
          ))
    }>
      <div className="flex flex-col gap-3.5">
        <CartUndo removal={removal} />
        {!cart.hydrated ? null : empty ? (
          <CartEmpty restaurantName={restaurant.name} />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {cart.items.map((line, i) => (
                <SideCartLineRow
                  key={line.lineId}
                  line={line}
                  totalCents={fresh ? (quote?.items[i]?.total_cents ?? null) : null}
                  onEdit={() => onEdit(line)}
                  onQty={(n) => removal.quantity(line.lineId, n)}
                  onRemove={() => removal.remove(line.lineId)}
                  unavailable={cartLineIssue(line, products.get(line.productId))}
                />
              ))}
            </ul>
            <CartMinimum missingCents={missingCents} menuHref={menu} deliveryPending={deliveryPending} onContinue={() => onOpenChange(false)} />
            <CouponBox
              compact
              couponCode={cart.couponCode}
              setCoupon={cart.setCoupon}
              quote={quote}
              quoteCoupon={quoteCoupon}
              loading={loading}
              quoteError={error}
              pendingText={estimateOnly ? "Será validado no checkout, com o endereço." : undefined}
            />
            <QuoteBreakdown
              className="border-t border-line pt-3"
              quote={quote}
              error={error}
              loading={loading}
              deliveryPending={deliveryPending}
              isDelivery={cart.type === "DELIVERY"}
              missingCents={missingCents}
              onRetry={retry}
              retrying={retrying}
              estimate={{ subtotalCents: estimateCents, minOrderCents: restaurant.minOrderCents }}
              couponPending={Boolean(cart.couponCode)}
              addressHint={ADDRESS_HINT}
              totalSize="md"
            />
            <CartSuggestions data={data} items={cart.items} blocked={blocked} onChoose={onChoose} />
          </>
        )}
      </div>
    </Panel>
  );
}
