"use client";

import { customerCheckoutHref } from "@/lib/customer-checkout";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Clock, Plus, ShoppingBag } from "lucide-react";
import { useMemo } from "react";
import { blockedReasonFor, NEEDS_TABLE_REASON, needsTable, useProductSheet } from "@/components/menu/menu-view";
import { deliveryRange } from "@/components/menu/format";
import { quickCartLine } from "@/components/menu/behavior";
import { Button, Icon, IconButton } from "@/components/ui";
import { cartCount } from "@/stores/cart";
import { ProductImage } from "@/components/menu/product-image";
import type { OpenState } from "@/lib/opening-hours";
import type { PublicMenu, PublicProduct } from "@/server/queries/public-menu";
import { ADDRESS_HINT, CartLineRow, CartMinimum, CouponBox, QuoteBreakdown } from "./cart-parts";
import { CartUndo } from "./cart-undo";
import { CartEmpty } from "./cart-empty";
import { CartSuggestions, getCartSuggestions } from "./cart-suggestions";
import { cartLineIssue } from "./cart-availability";
import { useCartRemoval } from "./use-cart-removal";
import { useCartQuote } from "./use-cart-quote";
import { canGoToCheckout } from "./use-quote";

export function menuHref(slug: string, type: string, table: number | null) {
  return type === "DINE_IN" && table ? `/cardapio/${slug}?table=${table}` : `/cardapio/${slug}`;
}

/** Dedicated cart page on every viewport; the menu also offers a compact side cart. */
export function CartView({ data, openState }: { data: PublicMenu; openState: OpenState }) {
  const r = data.restaurant;
  const router = useRouter();
  const { cart, quote, fresh, error, loading, deliveryPending, estimateOnly, estimateCents, quoteCoupon, missingCents, retry, retrying } =
    useCartQuote(r.slug, r.acceptsPickup, r.minOrderCents);
  const products = useMemo(() => {
    const m = new Map<string, PublicProduct>();
    for (const menu of data.menus) for (const c of menu.categories) for (const p of c.products) m.set(p.id, p);
    return m;
  }, [data.menus]);
  const removal = useCartRemoval(r.slug);
  const sheet = useProductSheet(r.slug, products, removal.remove);
  const blockedReason =
    cart.hydrated && needsTable(r, cart.type === "DINE_IN" ? cart.tableNumber : null) ? NEEDS_TABLE_REASON : blockedReasonFor(openState);
  const scheduleOnly = openState.kind === "closed" && openState.canSchedule;
  const ctaText = scheduleOnly ? "Agendar pedido" : "Finalizar pedido";
  const back = menuHref(r.slug, cart.type, cart.tableNumber);

  const typeLine =
    cart.type === "DINE_IN"
      ? cart.tableNumber
        ? `Mesa ${cart.tableNumber} · pedido no salão`
        : "Pedido no salão"
      : cart.type === "PICKUP"
        ? `Retirada em ${r.avgPrepMinutes} min`
        : `Entrega em ${deliveryRange(r.deliveryMinutes, r.avgPrepMinutes)}`;
  const canSwitch = cart.type !== "DINE_IN" && r.acceptsDelivery && r.acceptsPickup;
  const canCheckout = canGoToCheckout({
    hasItems: cart.items.length > 0,
    blocked: Boolean(blockedReason) || cart.items.some((line) => cartLineIssue(line, products.get(line.productId)) !== null),
    loading,
    hasQuote: Boolean(quote),
    estimateOnly,
    error,
    missingCents,
  });
  function choose(product: PublicProduct) {
    if (blockedReason || !product.available) return;
    const line = quickCartLine(product);
    if (!line) { sheet.openProduct(product); return; }
    sheet.add(line);
  }

  return (
    <div className="min-h-dvh w-full bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <IconButton label="Voltar" icon={ChevronLeft} size={40} variant="outline" onClick={() => {
            if (window.history.length > 1) router.back();
            else router.replace(back);
          }} />
          <div className="min-w-0 flex-1"><Link href={back} className="text-body-sm font-bold text-ink">{r.name}</Link><p className="text-caption text-ink-muted">Carrinho</p></div>
          <ShoppingBag size={22} className="text-brand" aria-hidden="true" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 pb-32 sm:px-6 lg:py-8">
        <div className="space-y-1"><h1 className="text-title-xl text-ink">Seu carrinho</h1><p className="text-body-sm text-ink-muted">Confira seu pedido e deixe tudo do seu jeito.</p></div>
        <CartUndo removal={removal} />
        {!cart.hydrated ? <p role="status" className="text-body-sm text-ink-muted">Carregando seu carrinho…</p> : cart.items.length === 0 ? (
          <div className="border border-line bg-surface p-6"><CartEmpty restaurantName={r.name} menuHref={back} /></div>
        ) : <div className="grid items-start gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0 space-y-5 lg:col-span-2">
            <section aria-label="Estabelecimento e modalidade" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-brand-soft text-title-sm text-brand">{r.logoUrl ? <ProductImage url={r.logoUrl} alt="" className="size-full" sizes="56px" /> : r.name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1"><h2 className="truncate text-item text-ink">{r.name}</h2><p className="mt-1 flex items-center gap-1 text-caption text-ink-muted"><Clock size={14} aria-hidden="true" />{typeLine}</p></div>
              {canSwitch && <button type="button" className="min-h-11 px-2 text-body-sm font-bold text-brand" onClick={() => cart.setType(cart.type === "DELIVERY" ? "PICKUP" : "DELIVERY")}>Trocar</button>}
            </section>
            <section aria-labelledby="cart-items-title" className="space-y-5 rounded-2xl border border-line bg-surface p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3"><h2 id="cart-items-title" className="text-subheading text-ink">Itens do pedido</h2><span className="text-caption text-ink-muted">{cartCount(cart.items)} {cartCount(cart.items) === 1 ? "item" : "itens"}</span></div>
            {blockedReason && (
              <p role="status" className="rounded-xl bg-danger-soft px-3.5 py-3 text-body-sm text-danger">
                {blockedReason}
              </p>
            )}
            <ul className="flex flex-col gap-5 divide-y divide-line [&>li+li]:pt-5">
              {cart.items.map((line, i) => (
                <CartLineRow
                  key={line.lineId}
                  line={line}
                  totalCents={fresh ? (quote?.items[i]?.total_cents ?? null) : null}
                  onQty={(n) => removal.quantity(line.lineId, n)}
                  onRemove={() => removal.remove(line.lineId)}
                  unavailable={cartLineIssue(line, products.get(line.productId))}
                  onEdit={products.has(line.productId) ? () => sheet.editLine(line) : undefined}
                />
              ))}
            </ul>
            <Link href={back} className="inline-flex min-h-11 items-center gap-1.5 text-body-sm font-bold text-brand">
              <Icon icon={Plus} size={16} />
              Adicionar mais itens
            </Link>
            </section>
          </div>
          <aside aria-labelledby="cart-summary-title" className="min-w-0 space-y-5 rounded-2xl border border-line bg-surface p-4 sm:p-6 lg:sticky lg:top-6 lg:col-start-3 lg:row-start-1 lg:row-span-2">
            <h2 id="cart-summary-title" className="text-subheading text-ink">Resumo do pedido</h2>
            <CartMinimum missingCents={missingCents} menuHref={back} deliveryPending={deliveryPending} />
            <CouponBox
              couponCode={cart.couponCode}
              setCoupon={cart.setCoupon}
              quote={quote}
              quoteCoupon={quoteCoupon}
              loading={loading}
              quoteError={error}
              pendingText={estimateOnly ? "Será validado no checkout, com o endereço." : undefined}
            />
            <QuoteBreakdown
              className="border-t border-line pt-4"
              quote={quote}
              error={error}
              loading={loading}
              deliveryPending={deliveryPending}
              isDelivery={cart.type === "DELIVERY"}
              missingCents={missingCents}
              onRetry={retry}
              retrying={retrying}
              estimate={{ subtotalCents: estimateCents, minOrderCents: r.minOrderCents }}
              couponPending={Boolean(cart.couponCode)}
              addressHint={ADDRESS_HINT}
            />
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-4 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:border-t-0 lg:p-0">
          <div className="mx-auto w-full max-w-xl">
            {canCheckout ? (
              <Button asChild size="xl" block>
                <Link href={customerCheckoutHref(r.slug)}>{ctaText}</Link>
              </Button>
            ) : (
              <Button size="xl" block disabled loading={loading && !error}>
                {ctaText}
              </Button>
            )}
          </div>
        </div>
          </aside>
          {getCartSuggestions(data, cart.items).length > 0 && <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-6 lg:col-span-2"><CartSuggestions data={data} items={cart.items} blocked={Boolean(blockedReason)} onChoose={choose} /></div>}
        </div>}
      </main>
      {sheet.render(blockedReason)}
      {sheet.confirmation}
    </div>
  );
}
