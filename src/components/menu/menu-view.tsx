"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Clock, Heart, Lock, Plus, Search, SearchX, Share2, ShoppingBag, Store } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SideCart } from "@/components/cart/side-cart";
import { useSingleShopCart } from "@/components/cart/use-single-shop-cart";
import { useCartQuote } from "@/components/cart/use-cart-quote";
import { useCartRemoval } from "@/components/cart/use-cart-removal";
import { CatalogRail } from "@/components/marketplace/catalog";
import { Badge, EmptyState, Icon, IconButton, Input, SegmentedControl, Tabs, TabsList, TabsTrigger, notify } from "@/components/ui";
import { segmentActive, segmentItem, segmentTrack } from "@/components/ui/segmented-control";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { DEFAULT_MENU_SECTIONS } from "@/lib/menu-experience";
import { restaurantAccentStyle } from "@/lib/restaurant-accent";
import type { OpenState } from "@/lib/opening-hours";
import type { OrderType } from "@/lib/order-status";
import type { PublicMenu, PublicProduct } from "@/server/queries/public-menu";
import { cartCount, cartEstimate, useCart, type CartLine, type NewCartLine } from "@/stores/cart";
import { deliveryRange, displayPrice, itemsLabel, shortMoney } from "./format";
import { ProductImage } from "./product-image";
import { ProductSheet } from "./product-sheet";
import { quickCartLine, searchMenu } from "./behavior";
import { useMenuContext } from "./use-menu-context";

export const NEEDS_TABLE_REASON = "Escaneie o QR Code da mesa para pedir.";

/** Dine-in-only restaurant opened without a valid `?table=`: there is no order type to use. */
export function needsTable(r: { acceptsDelivery: boolean; acceptsPickup: boolean }, table: number | null): boolean {
  return !r.acceptsDelivery && !r.acceptsPickup && table == null;
}

export function blockedReasonFor(open: OpenState): string | null {
  if (open.kind === "paused") return "O restaurante pausou os pedidos temporariamente.";
  if (open.kind === "closed" && !open.canSchedule) return "O restaurante está fechado no momento.";
  return null;
}

type SheetState = { product: PublicProduct; editing: CartLine | null; open: boolean; key: number };

/** Hook shared by the menu and the cart page: product sheet for adding or editing a line. */
export function useProductSheet(slug: string, products: Map<string, PublicProduct>, onRemove?: (lineId: string) => void, onAdded?: () => void) {
  const cart = useCart(slug);
  const { addToCart, confirmation } = useSingleShopCart();
  function add(line: NewCartLine) {
    addToCart(slug, () => {
      cart.add(line);
      onAdded?.();
      notify.success(`${line.name} adicionado ao carrinho`);
    });
  }
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const counter = useRef(0);
  const origin = useRef<{ y: number; focus: HTMLElement | null } | null>(null);

  function rememberOrigin() {
    origin.current = { y: window.scrollY, focus: document.activeElement instanceof HTMLElement ? document.activeElement : null };
  }
  function close(restoreFocus = true) {
    setSheet((s) => s ? { ...s, open: false } : s);
    if (!restoreFocus) return;
    requestAnimationFrame(() => {
      const previous = origin.current;
      if (!previous) return;
      previous.focus?.focus({ preventScroll: true });
      window.scrollTo({ top: previous.y, behavior: "instant" });
    });
  }

  function openProduct(product: PublicProduct) {
    rememberOrigin();
    counter.current += 1;
    setSheet({ product, editing: null, open: true, key: counter.current });
  }
  function editLine(line: CartLine) {
    const product = products.get(line.productId);
    if (!product) return;
    rememberOrigin();
    counter.current += 1;
    setSheet({ product, editing: line, open: true, key: counter.current });
  }
  function render(blockedReason: string | null) {
    if (!sheet) return null;
    return (
      <ProductSheet
        key={sheet.key}
        product={sheet.product}
        editing={sheet.editing}
        open={sheet.open}
        blockedReason={sheet.editing ? null : blockedReason}
        onOpenChange={(open) => { if (!open) close(); }}
        onSubmit={(line) => {
          if (sheet.editing) {
            cart.update(sheet.editing.lineId, line);
            notify.success("Item atualizado");
            close();
          } else {
            close(!onAdded);
            add(line);
          }
        }}
        onRemove={
          sheet.editing
            ? () => {
                (onRemove ?? cart.remove)(sheet.editing!.lineId);
                close();
              }
            : undefined
        }
      />
    );
  }
  return { openProduct, editLine, render, add, confirmation };
}

export interface MenuViewProps {
  rating?: { average: number | null; total: number } | null;
  data: PublicMenu;
  openState: OpenState;
  /** Valid table from `?table=` (QR code). */
  table: number | null;
  /** `?table=` value that does not exist for this restaurant. */
  invalidTable: number | null;
}

/** Public menu: reference 03 (mobile) and W2 (desktop, catalog and a bag drawer). */
export function MenuView({ data, openState, table, invalidTable, rating }: MenuViewProps) {
  useEffect(() => { try { sessionStorage.setItem("menzu-shopping-origin", window.location.pathname); } catch {} }, []);
  const { restaurant: r, menus } = data;
  const router = useRouter();
  const cart = useCart(r.slug);
  const { items, hydrated, type, setType, setTable } = cart;
  const context = useMenuContext(r.slug, menus[0]?.id ?? "");
  const { menuId, query, favorites, toggleFavorite, savePosition } = context;
  const setMenuId = (menuId: string) => context.update({ menuId });
  const setQuery = (query: string) => context.update({ query });
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  // Category picked by a tab click: the scroll-spy must not override it while the smooth scroll
  // runs (the last section often cannot reach the top, so the previous one would win).
  const scrollLock = useRef<string | null>(null);

  const products = useMemo(() => {
    const m = new Map<string, PublicProduct>();
    for (const menu of menus) for (const c of menu.categories) for (const p of c.products) m.set(p.id, p);
    return m;
  }, [menus]);
  const [cartOpen, setCartOpen] = useState(false);
  const removal = useCartRemoval(r.slug);
  const sheet = useProductSheet(r.slug, products, removal.remove, () => { savePosition(); setCartOpen(true); });
  const noTable = needsTable(r, table);
  const blockedReason = noTable ? NEEDS_TABLE_REASON : blockedReasonFor(openState);
  const scheduleOnly = openState.kind === "closed" && openState.canSchedule;
  function openCart() {
    savePosition();
    setCartOpen(true);
  }

  const typeOptions = useMemo(() => {
    const opts: { value: OrderType; label: string }[] = [];
    if (r.acceptsDelivery) opts.push({ value: "DELIVERY", label: `Entrega · ${deliveryRange(r.deliveryMinutes, r.avgPrepMinutes)}` });
    if (r.acceptsPickup) opts.push({ value: "PICKUP", label: `Retirada · ${r.avgPrepMinutes} min` });
    return opts;
  }, [r]);

  // Keep the cart's order type consistent with the QR table and what the restaurant offers.
  useEffect(() => {
    if (!hydrated) return;
    if (table != null) {
      if (type !== "DINE_IN") setType("DINE_IN");
      setTable(table);
      return;
    }
    if (type === "DINE_IN" || !typeOptions.some((o) => o.value === type)) {
      setTable(null);
      if (typeOptions[0]) setType(typeOptions[0].value);
    }
  }, [hydrated, table, type, typeOptions, setType, setTable]);

  const menu = menus.find((m) => m.id === menuId) ?? menus[0];
  const q = query.trim();
  const categories = useMemo(() => {
    if (!menu) return [];
    if (!q) return menu.categories;
    return searchMenu(menus, q);
  }, [menu, menus, q]);
  const preferredCat = activeCat ?? context.category;
  const currentCat = preferredCat && categories.some((c) => c.id === preferredCat) ? preferredCat : (categories[0]?.id ?? null);

  // Measure all section positions: observer entries alone omit unchanged visible sections.
  useEffect(() => {
    const sections = categories.map((c) => document.getElementById(`cat-${c.id}`)).filter((el): el is HTMLElement => !!el);
    let frame = 0;
    const measure = () => {
      frame = 0;
      setCompact(Boolean(headerRef.current && headerRef.current.getBoundingClientRect().bottom <= 0));
      if (scrollLock.current || !sections.length) return;
      const atBottom = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const reached = sections.filter((section) => section.getBoundingClientRect().top <= 130);
      const section = atBottom ? sections[sections.length - 1] : reached[reached.length - 1] ?? sections[0];
      setActiveCat(section.id.slice(4));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    measure();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [categories]);

  // Keep the active mobile tab visible.
  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>(`[data-cat="${currentCat}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [currentCat]);

  function goTo(catId: string) {
    setActiveCat(catId);
    context.update({ category: catId });
    scrollLock.current = catId;
    const release = () => {
      // Intersection callbacks from the scroll's last frames can arrive just after `scrollend`.
      setTimeout(() => {
        if (scrollLock.current === catId) scrollLock.current = null;
      }, 250);
      window.removeEventListener("scrollend", release);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
    };
    window.addEventListener("scrollend", release, { once: true });
    // The customer taking over the scroll hands control back to the scroll-spy.
    window.addEventListener("wheel", release, { once: true, passive: true });
    window.addEventListener("touchstart", release, { once: true, passive: true });
    // No scroll needed (already in place) or no `scrollend` support: release after the animation.
    setTimeout(release, "onscrollend" in window ? 1500 : 900);
    document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function share() {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) await navigator.share({ title: r.name, url });
      else {
        await navigator.clipboard.writeText(url);
        notify.success("Link copiado");
      }
    } catch {
      // Share sheet dismissed.
    }
  }

  const count = cartCount(items);
  const sectionTitles = { offers: "Ofertas", bestsellers: "Mais pedidos", favorites: "Seus favoritos", featured: "Destaques da loja" };
  const sectionProducts = {
    offers: [...products.values()].filter((p) => displayPrice(p).strikeCents != null),
    bestsellers: (data.experience?.bestsellers ?? []).flatMap((sale) => { const p = products.get(sale.productId); return p ? [p] : []; }),
    favorites: favorites.flatMap((id) => { const p = products.get(id); return p ? [p] : []; }),
    featured: (data.experience?.featuredProductIds ?? []).flatMap((id) => { const p = products.get(id); return p ? [p] : []; }),
  };
  const specialSections = data.experience?.sections ?? DEFAULT_MENU_SECTIONS;
  const quoted = useCartQuote(r.slug, r.acceptsPickup, r.minOrderCents);
  const estimate = cartEstimate(items);
  const missing = quoted.missingCents ?? Math.max(0, r.minOrderCents - (quoted.fresh ? quoted.quote?.subtotal_cents ?? estimate : estimate));
  const feeLabel = type !== "DELIVERY" ? "Sem taxa de entrega" : quoted.fresh && !quoted.deliveryPending && quoted.quote ? (quoted.quote.delivery_fee_cents === 0 ? "Entrega grátis" : `Entrega ${formatMoney(quoted.quote.delivery_fee_cents)}`) : "Taxa calculada com o endereço";
  function quickAdd(product: PublicProduct) {
    if (blockedReason || !product.available) return;
    const line = quickCartLine(product);
    if (!line) { sheet.openProduct(product); return; }
    sheet.add(line);
  }
  const statusTone = openState.kind === "open" ? "bg-surface-muted text-ink-secondary" : openState.kind === "paused" ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger";
  const timeLabel = type === "PICKUP" || type === "DINE_IN" ? `${r.avgPrepMinutes} min` : quoted.fresh && !quoted.deliveryPending && quoted.quote ? `${quoted.quote.estimated_minutes} min` : deliveryRange(r.deliveryMinutes, r.avgPrepMinutes);

  return (
    <div className={cn("min-h-dvh w-full bg-surface", count > 0 && "pb-24 lg:pb-0")}>
      <div
        className="w-full overflow-clip bg-surface"
        style={restaurantAccentStyle(r.primaryColor)}
      >
        <div className={cn("fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 shadow-card", !compact && "hidden")} aria-hidden={!compact}>
          <IconButton label="Voltar ao início" icon={ChevronLeft} size={34} onClick={() => router.push("/")} />
          <span className="min-w-0 flex-1 truncate text-body font-bold text-ink">{r.name}</span>
          <IconButton label="Buscar no cardápio" icon={Search} size={34} onClick={() => { document.getElementById("menu-search")?.focus({ preventScroll: true }); document.getElementById("menu-search")?.scrollIntoView({ block: "center", behavior: "smooth" }); }} />
          {compact && <button type="button" aria-label={`Abrir carrinho, ${count} ${count === 1 ? "item" : "itens"}`} onClick={openCart} className="flex min-h-11 items-center gap-1 px-2 text-brand"><ShoppingBag size={20} />{count > 0 && <span>{count}</span>}</button>}
        </div>
        {/* Cover */}
        <div className="relative h-37.5 lg:h-45">
          <ProductImage url={r.bannerUrl} alt={`Capa de ${r.name}`} kind="cover" className="absolute inset-0" sizes="100vw" priority />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <IconButton
              label="Voltar"
              icon={ChevronLeft}
              size={34}
              className="border-transparent bg-surface/90"
              onClick={() => router.push("/")}
            />
            <div className="flex items-center gap-2">
              {!compact && <button type="button" aria-label={`Abrir carrinho, ${count} ${count === 1 ? "item" : "itens"}`} onClick={openCart} className="flex min-h-11 items-center gap-1 rounded-xl bg-surface/90 px-2 text-brand"><ShoppingBag size={20} />{count > 0 && <span>{count}</span>}</button>}
              <IconButton label="Compartilhar" icon={Share2} size={34} className="border-transparent bg-surface/90" onClick={share} />
            </div>
          </div>
          {r.primaryColor && <div data-restaurant-accent="" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-restaurant" />}
        </div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-6.5 lg:p-6.5">
          {/* Restaurant header (+ desktop category nav) */}
          <aside className="flex min-w-0 flex-col gap-3.5 px-5 lg:col-span-1 lg:gap-4 lg:px-0">
            <div className="flex items-start gap-3.5 lg:flex-col lg:gap-4">
              <div className="relative z-1 -mt-8.5 flex size-19 shrink-0 items-center justify-center overflow-hidden rounded-5xl border border-line bg-surface shadow-raised lg:-mt-24 lg:size-24 lg:rounded-6xl lg:shadow-raised-lg">
                {r.logoUrl ? (
                  <ProductImage url={r.logoUrl} alt={`Logo de ${r.name}`} className="size-full" sizes="96px" />
                ) : (
                  <span className="text-title-md text-restaurant" aria-hidden="true">
                    {r.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-0.75 pt-3 pb-1 lg:gap-1.5 lg:py-0">
                <h1 className="break-words text-title-sm text-ink lg:text-title-xl">{r.name}</h1>
                {rating && <p className="text-body-sm text-ink-muted">
                  <span aria-hidden="true" className="text-brand">★ </span>
                  {rating.average == null ? "Sem avaliações" : `${rating.average.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} de 5 · ${rating.total.toLocaleString("pt-BR")} ${rating.total === 1 ? "avaliação" : "avaliações"}`}
                </p>}
                {r.addressLine && <p className="text-caption text-ink-muted lg:text-body-sm lg:font-normal">{r.addressLine}</p>}
              </div>
            </div>
            {r.description && <p className="text-caption text-ink-muted">{r.description}</p>}
            <p className="text-caption text-ink-muted" aria-live="polite">{feeLabel}</p>
            <div className="flex flex-wrap gap-2">
              <span className={cn("rounded-md px-2.5 py-1.5 text-caption font-bold", statusTone)}>{openState.label}</span>
              {r.minOrderCents > 0 && (
                <span className="rounded-md bg-surface-muted px-2.5 py-1.5 text-caption font-semibold text-ink-secondary">
                  Mín. {shortMoney(r.minOrderCents)}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2.5 py-1.5 text-caption font-semibold text-ink-secondary">
                <Icon icon={Clock} size={16} />
                {timeLabel}
              </span>
            </div>

            <div ref={headerRef} aria-hidden="true" />
            {categories.length > 0 && (
              <nav aria-label="Categorias" className="hidden flex-col gap-0.75 border-t border-line pt-2 lg:sticky lg:top-16 lg:flex">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => goTo(c.id)}
                    aria-current={c.id === currentCat ? "true" : undefined}
                    className={cn(
                      "rounded-xl px-3.25 py-2.75 text-left text-body-sm transition-colors duration-150 ease-out",
                      c.id === currentCat ? "bg-brand-soft font-bold text-brand" : "font-semibold text-ink-secondary hover:bg-surface-muted",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </nav>
            )}
          </aside>

          {/* Items */}
          <main className="flex min-w-0 flex-col gap-3.5 px-5 pt-3.5 pb-6 lg:col-span-3 lg:gap-4 lg:p-0">
            {openState.kind !== "open" && (
              <div role="status" className={cn("flex items-start gap-3 rounded-2xl px-3.5 py-3", openState.kind === "paused" ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger")}>
                <Icon icon={Store} size={20} className="mt-px" />
                <div className="text-body-sm">
                  <p className="font-bold">{openState.kind === "paused" ? "Pedidos pausados" : openState.label}</p>
                  <p className="font-normal">
                    {openState.kind === "paused"
                      ? "O restaurante pausou os pedidos temporariamente. Volte em instantes."
                      : openState.canSchedule
                        ? "Você pode montar o carrinho e agendar seu pedido."
                        : "Você pode ver o cardápio, mas não é possível pedir agora."}
                  </p>
                </div>
              </div>
            )}

            {table != null ? (
              <div className={cn("flex lg:self-start", segmentTrack)}>
                <span className={cn(segmentItem, segmentActive, "inline-flex flex-1 items-center justify-center gap-1.5 px-4.5")}>
                  <Icon icon={Lock} size={16} />
                  Mesa {table} · pedido no salão
                </span>
              </div>
            ) : (
              typeOptions.length > 1 && (
                <SegmentedControl
                  aria-label="Tipo de pedido"
                  options={typeOptions}
                  value={type === "PICKUP" ? "PICKUP" : "DELIVERY"}
                  onChange={setType}
                  block
                  className="lg:inline-flex lg:w-auto lg:self-start lg:[&>button]:whitespace-nowrap lg:[&>button]:px-4.5"
                />
              )
            )}
            {noTable && (
              <p role="status" className="flex items-start gap-2 rounded-2xl bg-brand-tint px-3.5 py-3 text-body-sm font-semibold text-ink-secondary">
                <Icon icon={Lock} size={18} className="mt-px text-brand" />
                {NEEDS_TABLE_REASON}
              </p>
            )}
            {invalidTable != null && (
              <p role="status" className="text-caption font-semibold text-danger">
                Mesa {invalidTable} não encontrada. Peça ajuda ao atendente.
              </p>
            )}

            {menus.length > 1 && (
              <Tabs value={menu?.id} onValueChange={(v) => setMenuId(v)}>
                <TabsList variant="pill" className="max-w-full overflow-x-auto lg:self-start">
                  {menus.map((m) => (
                    <TabsTrigger key={m.id} value={m.id}>
                      {m.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            <div role="search">
              <label htmlFor="menu-search" className="sr-only">
                Buscar no cardápio
              </label>
              <Input
                id="menu-search"
                type="search"
                size="lg"
                leftIcon={Search}
                placeholder="Buscar no cardápio"
                value={query}
                maxLength={100}
                onChange={(e) => setQuery(e.target.value)}
                wrapperClassName="lg:h-11 lg:rounded-lg"
              />
            </div>

            {categories.length > 0 && (
              <div className="sticky top-14 z-10 -mx-5 bg-surface px-5 pt-2 lg:hidden">
                <nav ref={tabsRef} aria-label="Categorias" className="flex gap-4 overflow-x-auto border-b border-line [scrollbar-width:none]">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      data-cat={c.id}
                      onClick={() => goTo(c.id)}
                      aria-current={c.id === currentCat ? "true" : undefined}
                      className={cn(
                        "-mb-px shrink-0 whitespace-nowrap border-b-2 pb-2.5 text-body-sm transition-colors duration-150 ease-out",
                        c.id === currentCat ? "border-brand font-extrabold text-brand" : "border-transparent font-semibold text-ink-subtle hover:text-ink",
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </nav>
              </div>
            )}

            {!q && specialSections.filter((section) => section.enabled && sectionProducts[section.id].length > 0).map((section) => <section key={section.id} aria-labelledby={`special-${section.id}`} className="space-y-3">
              <h2 id={`special-${section.id}`} className="text-subheading text-ink lg:text-heading">{sectionTitles[section.id]}</h2>
              <CatalogRail label={sectionTitles[section.id]}>{sectionProducts[section.id].map((p) => <div key={p.id} className="w-60 shrink-0 snap-start"><ProductTile product={p} onOpen={() => sheet.openProduct(p)} onAdd={() => quickAdd(p)} blocked={Boolean(blockedReason)} favorite={favorites.includes(p.id)} onFavorite={() => toggleFavorite(p.id)} /></div>)}</CatalogRail>
            </section>)}

            {categories.length === 0 ? (
              q ? (
                <EmptyState icon={SearchX} title="Nada encontrado" description={`Nenhum item corresponde a “${query.trim()}”.`} />
              ) : (
                <EmptyState icon={Store} title="Cardápio em preparação" description="Este restaurante ainda não publicou itens." />
              )
            ) : (
              categories.map((c) => (
                <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`h-${c.id}`} className="flex scroll-mt-28 flex-col gap-3.5 pt-2 lg:scroll-mt-20 lg:gap-4 lg:pt-0">
                  <h2 id={`h-${c.id}`} className="text-subheading text-ink lg:text-heading">
                    {c.name}
                  </h2>
                  <ul className="flex flex-col gap-3.5 lg:gap-4">
                    {c.products.map((p) => (
                      <li key={p.id}>
                        <ProductRow product={p} onOpen={() => sheet.openProduct(p)} onAdd={() => quickAdd(p)} blocked={Boolean(blockedReason)} favorite={favorites.includes(p.id)} onFavorite={() => toggleFavorite(p.id)} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </main>


        </div>
      </div>

      {hydrated && count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-5 pt-3.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:hidden">
          {missing > 0 && <p className="mb-2 text-caption text-ink-muted" role="status">Faltam {formatMoney(missing)} para o pedido mínimo{type === "DELIVERY" && quoted.deliveryPending ? " da loja; o endereço pode ter outro mínimo" : ""}.</p>}
          <button
            type="button"
            onClick={openCart}
            className="flex h-13.5 w-full items-center justify-between gap-3 rounded-2xl bg-inverse px-4.5 transition-colors duration-150 ease-out hover:bg-inverse-hover"
          >
            <span className="truncate text-body-sm text-on-inverse">
              {itemsLabel(count)} · {formatMoney(cartEstimate(items))}
            </span>
            <span className="shrink-0 text-body font-extrabold text-white">Ver carrinho</span>
          </button>
        </div>
      )}

      <SideCart open={cartOpen} onOpenChange={setCartOpen} data={data} restaurant={r} blocked={Boolean(blockedReason)} scheduleOnly={scheduleOnly} onEdit={sheet.editLine} onChoose={quickAdd} quoted={quoted} removal={removal} />
      {sheet.render(blockedReason)}
      {sheet.confirmation}
    </div>
  );
}

function ProductRow({ product: p, onOpen, onAdd, blocked, favorite, onFavorite }: { product: PublicProduct; onOpen: () => void; onAdd: () => void; blocked: boolean; favorite: boolean; onFavorite: () => void }) {
  const price = displayPrice(p);
  return (
    <div className="flex gap-2 border-b border-line pb-4 lg:rounded-3xl lg:border lg:p-3.5">
    <button
      type="button"
      onClick={onOpen}
      disabled={!p.available}
      aria-label={p.available ? `${p.name}, ${formatMoney(price.cents)}` : `${p.name}, indisponível`}
      className={cn(
        "flex min-w-0 flex-1 gap-3 text-left transition-[border-color,transform] duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "lg:h-full lg:gap-3.5",
        p.available ? "not-disabled:active:translate-y-px lg:hover:border-line-strong" : "cursor-not-allowed opacity-65",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1 lg:gap-1.25">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-item text-ink">{p.name}</span>
          {!p.available && (
            <Badge tone="neutral" size="sm">
              Indisponível
            </Badge>
          )}
        </span>
        {p.description && <span className="line-clamp-2 text-caption text-ink-muted">{p.description}</span>}
        <span className="flex items-baseline gap-2 lg:mt-auto">
          <span className="text-item font-extrabold text-ink">
            {price.fromPrefix && <span className="text-caption font-semibold text-ink-muted">a partir de </span>}
            {formatMoney(price.cents)}
          </span>
          {price.strikeCents != null && <span className="text-caption text-ink-disabled line-through">{formatMoney(price.strikeCents)}</span>}
        </span>
      </span>
      <ProductImage
        url={p.imageUrl}
        alt=""
        kind={p.available ? "food" : "off"}
        className="size-22 shrink-0 rounded-3xl lg:size-21 lg:rounded-2xl"
        sizes="88px"
      />
    </button>
    <div className="flex shrink-0 flex-col items-center justify-between gap-2">
      <button type="button" aria-label={`${favorite ? "Desfavoritar" : "Favoritar"} ${p.name}`} aria-pressed={favorite} onClick={onFavorite} className="flex size-11 items-center justify-center text-brand focus-visible:outline-2 focus-visible:outline-accent"><Heart size={19} fill={favorite ? "currentColor" : "none"} /></button>
      <button type="button" aria-label={`Adicionar ${p.name}`} disabled={blocked || !p.available} onClick={onAdd} className="flex size-11 items-center justify-center rounded-lg border border-line text-brand disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent"><Plus size={20} /></button>
    </div>
    </div>
  );
}

function ProductTile({ product: p, onOpen, onAdd, blocked, favorite, onFavorite }: { product: PublicProduct; onOpen: () => void; onAdd: () => void; blocked: boolean; favorite: boolean; onFavorite: () => void }) {
  const price = displayPrice(p);
  return <article className="space-y-2">
    <button type="button" onClick={onOpen} disabled={!p.available} aria-label={`Detalhes de ${p.name}`} className="block w-full space-y-2 text-left focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60">
      <ProductImage url={p.imageUrl} alt="" className="aspect-4/3 w-full rounded-xl" sizes="240px" />
      <h3 className="line-clamp-2 text-item text-ink">{p.name}</h3>
      <p className="line-clamp-2 text-caption text-ink-muted">{p.description}</p>
      <div className="flex flex-wrap items-baseline gap-2"><span className="text-body font-bold text-brand">{price.fromPrefix ? "A partir de " : ""}{formatMoney(price.cents)}</span>{price.strikeCents != null && <span className="text-caption text-ink-muted line-through">{formatMoney(price.strikeCents)}</span>}</div>
      {!p.available && <Badge tone="neutral" size="sm">Indisponível</Badge>}
    </button>
    <div className="flex justify-between gap-2"><button type="button" aria-label={`${favorite ? "Desfavoritar" : "Favoritar"} ${p.name}`} aria-pressed={favorite} onClick={onFavorite} className="flex size-11 items-center justify-center text-brand focus-visible:outline-2 focus-visible:outline-accent"><Heart size={19} fill={favorite ? "currentColor" : "none"} /></button><button type="button" disabled={blocked || !p.available} onClick={onAdd} aria-label={`Adicionar ${p.name}`} className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-caption font-bold text-brand disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent"><Plus size={18} />Adicionar</button></div>
  </article>;
}
