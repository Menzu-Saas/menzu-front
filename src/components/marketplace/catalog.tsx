"use client";

import Link from "next/link";
import { Children, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { ProductImage } from "@/components/menu/product-image";
import { formatMoney } from "@/lib/money";
import type { FoodCategory, MarketplaceCampaign, MarketplaceProduct, MarketplaceRestaurant } from "@/lib/marketplace";
import { canAddNow } from "./helpers";

export function Section({ id, title, description, children, onMore }: { id: string; title: string; description?: string; children: ReactNode; onMore?: () => void }) {
  return <section id={id} aria-labelledby={id + "-title"} className="scroll-mt-36 space-y-3">
    <div className="flex items-start justify-between gap-4"><div><h2 id={id + "-title"} className="text-heading text-ink">{title}</h2>{description && <p className="mt-1 text-body-sm text-ink-muted">{description}</p>}</div>{onMore && <button type="button" onClick={onMore} className="min-h-11 shrink-0 text-body-sm font-bold text-brand">Ver mais</button>}</div>
    {children}
  </section>;
}

export function CatalogRail({ label, children }: { label: string; children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  return <div className="relative">
    <div ref={rail} role="region" aria-label={label} tabIndex={0} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 focus-visible:outline-2 focus-visible:outline-accent sm:gap-6">{children}</div>
    {Children.count(children) > 1 && <>
      <div className="pointer-events-none absolute inset-y-0 left-2 z-10 hidden items-center md:flex"><Button variant="outline" aria-label={"Anterior: " + label} className="pointer-events-auto size-11 rounded-full p-0 shadow-card" onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth * 0.8, behavior: "smooth" })}><ArrowLeft size={20} /></Button></div>
      <div className="pointer-events-none absolute inset-y-0 right-2 z-10 hidden items-center md:flex"><Button variant="outline" aria-label={"Próximo: " + label} className="pointer-events-auto size-11 rounded-full p-0 shadow-card" onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth * 0.8, behavior: "smooth" })}><ArrowRight size={20} /></Button></div>
    </>}
  </div>;
}

const CATEGORY_ICONS: [RegExp, string][] = [
  [/açaí/i, "🫐"], [/lanche|burg/i, "🍔"], [/doces?|bolo/i, "🍰"], [/promo/i, "🏷️"],
  [/brasileir/i, "🍛"], [/sorvet/i, "🍨"], [/padari|pães/i, "🥖"], [/salgad/i, "🥟"],
  [/marmit/i, "🍱"], [/japone|sushi/i, "🍣"], [/saudável|salad/i, "🥗"], [/pizz/i, "🍕"],
  [/bebida/i, "🥤"], [/massa|past[ae]l/i, "🍝"],
];

export function Categories({ items, selected, onSelect }: { items: FoodCategory[]; selected?: string; onSelect: (id: string) => void }) {
  return <CatalogRail label="Categorias">{items.map((category) => {
    const active = selected === category.id;
    const tile = `flex h-16 w-full items-center justify-center rounded-2xl border sm:h-18 ${active ? "border-brand bg-brand-soft" : "border-transparent bg-surface-muted"}`;
    return <button type="button" key={category.id} aria-label={category.name} aria-pressed={active} onClick={() => onSelect(category.id)} className="w-22 shrink-0 snap-start space-y-2 text-center text-body-sm text-ink-muted focus-visible:outline-2 focus-visible:outline-accent sm:w-26">
      {category.imageUrl ? <ProductImage url={category.imageUrl} alt="" className={tile} sizes="104px" /> : <span aria-hidden="true" className={tile}><span className="text-display">{CATEGORY_ICONS.find(([pattern]) => pattern.test(category.name))?.[1] ?? "🍽️"}</span></span>}
      <span className={active ? "block font-bold text-brand" : "block"}>{category.name}</span>
    </button>;
  })}</CatalogRail>;
}

const campaignDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  timeZone: "America/Sao_Paulo", hourCycle: "h23",
});

export function Campaigns({ items, onSelect, label }: { items: MarketplaceCampaign[]; onSelect: (item: MarketplaceCampaign) => void; label: string }) {
  const rail = useRef<HTMLDivElement>(null);
  return <div className="space-y-3">
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" aria-label={"Anterior: " + label} onClick={() => rail.current?.scrollBy({ left: -(rail.current.clientWidth * 0.8), behavior: "smooth" })}><ArrowLeft size={18} /></Button>
      <Button variant="outline" size="sm" aria-label={"Próximo: " + label} onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth * 0.8, behavior: "smooth" })}><ArrowRight size={18} /></Button>
    </div>
    <div ref={rail} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3" aria-label={label} tabIndex={0}>
      {items.map((item) => <article key={item.id} className="w-full shrink-0 snap-start sm:w-112">
        <button type="button" onClick={() => onSelect(item)} aria-label={"Ver campanha: " + item.title} className="block w-full overflow-hidden rounded-2xl border border-line bg-surface text-left focus-visible:outline-2 focus-visible:outline-accent">
          <ProductImage url={item.imageUrl ?? "/banners/menzu-descubra.png"} alt={item.title} kind="cover" label={item.title} sizes="(min-width: 640px) 448px, 100vw" className="aspect-698/300 w-full" />
        </button>
        <div className="space-y-1 px-1 pt-3">
          <h3 className="text-body-sm font-bold text-ink">{item.title}</h3>
          {item.description && <p className="text-caption text-ink-muted">{item.description}</p>}
          <p className="text-caption text-ink-muted">Válida de <time dateTime={item.startsAt}>{campaignDate.format(new Date(item.startsAt))}</time> até <time dateTime={item.endsAt}>{campaignDate.format(new Date(item.endsAt))}</time> (horário de São Paulo).</p>
        </div>
      </article>)}
    </div>
  </div>;
}

export function ProductCard({ product, onOpen, onAdd, vertical = false, busy }: { product: MarketplaceProduct; onOpen: () => void; onAdd: () => void; vertical?: boolean; busy: boolean }) {
  const enabled = canAddNow(product);
  const discount = product.discountPercent > 0 && product.promoPriceCents != null && product.promoPriceCents < product.priceCents && product.variants.length === 0;
  return <article className={vertical ? "flex overflow-hidden rounded-2xl border border-line bg-surface" : "flex h-full flex-col bg-surface"}>
    <button type="button" onClick={onOpen} className={"block shrink-0 text-left focus-visible:outline-2 focus-visible:outline-accent " + (vertical ? "w-28 sm:w-32" : "w-full overflow-hidden rounded-2xl")} aria-label={"Ver detalhes de " + product.name}>
      <ProductImage url={product.imageUrl} alt={product.name} sizes={vertical ? "128px" : "224px"} className={vertical ? "h-28 w-full sm:h-32" : "aspect-6/5 w-full"} />
    </button>
    <div className={"flex min-w-0 flex-1 flex-col gap-2 " + (vertical ? "p-3" : "py-3")}>
      {vertical && <Link href={"/cardapio/" + product.restaurant.slug} className="text-caption text-ink-muted hover:text-brand">{product.restaurant.name}</Link>}
      <button type="button" onClick={onOpen} className={"line-clamp-2 text-left text-body text-ink hover:text-brand " + (vertical ? "font-bold" : "min-h-10 font-medium")}>{product.name}</button>
      {vertical && product.description && <p className="line-clamp-1 text-body-sm text-ink-muted">{product.description}</p>}
      {vertical && <p className="text-caption text-ink-faint">{deliveryLabel(product.restaurant)} · {product.restaurant.feeCents === 0 ? "Entrega grátis" : "Entrega " + formatMoney(product.restaurant.feeCents)}</p>}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
        <div>{discount && <p className="text-caption text-ink-faint line-through">{formatMoney(product.displayCents + product.priceCents - (product.promoPriceCents ?? product.priceCents))}</p>}
          {product.fromPrefix && <span className="text-caption text-ink-muted">A partir de </span>}
          <div className="flex flex-wrap items-center gap-2"><p className={"text-heading " + (discount ? "text-success" : "text-ink")}>{formatMoney(product.displayCents)}</p>{discount && <span className="rounded bg-success-soft px-1.5 py-0.5 text-caption font-bold text-success">-{product.discountPercent}%</span>}</div>
        </div>
        <Button size="sm" disabled={!enabled || busy} onClick={onAdd} aria-label={"Adicionar " + product.name}><Plus size={16} />{busy ? "Conferindo…" : enabled ? "Adicionar" : "Indisponível"}</Button>
      </div>
    </div>
    {!vertical && <Link href={"/cardapio/" + product.restaurant.slug} className="mt-1 flex min-h-16 items-center gap-3 border-t border-line py-3 text-caption text-ink-muted hover:text-brand">
      <ProductImage url={product.restaurant.logoUrl ?? product.restaurant.bannerUrl} alt="" className="size-10 shrink-0 rounded-xl" sizes="40px" />
      <span className="min-w-0"><span className="block truncate font-bold text-ink">{product.restaurant.name}</span><span>{deliveryLabel(product.restaurant)} · {product.restaurant.feeCents === 0 ? "Entrega grátis" : formatMoney(product.restaurant.feeCents)}</span></span>
    </Link>}
  </article>;
}

export function deliveryLabel(restaurant: MarketplaceRestaurant) {
  if (!restaurant.openNow || restaurant.status !== "OPEN") return restaurant.status === "PAUSED" ? "Pausado" : restaurant.canSchedule ? "Fechado · agende no cardápio" : "Fechado";
  return restaurant.etaMinutes != null ? restaurant.etaMinutes + " min" : "Aberto";
}

export function RestaurantCard({ restaurant, hasOffers = false }: { restaurant: MarketplaceRestaurant; hasOffers?: boolean }) {
  return <Link href={"/cardapio/" + restaurant.slug} className="flex min-w-0 items-start gap-3 border-b border-line py-4 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent sm:gap-4">
    <ProductImage url={restaurant.logoUrl ?? restaurant.bannerUrl} alt="" kind="cover" sizes="112px" className="size-22 shrink-0 rounded-2xl sm:size-28" />
    <div className="min-w-0 flex-1 space-y-1.5"><h3 className="truncate text-body font-bold text-ink sm:text-heading">{restaurant.name}</h3>
      {restaurant.description && <p className="line-clamp-1 text-body-sm text-ink-muted">{restaurant.description}</p>}
      <p className="text-body-sm text-ink-secondary">{deliveryLabel(restaurant)} · <span className={restaurant.feeCents === 0 ? "font-medium text-success" : ""}>{restaurant.feeCents === 0 ? "Entrega grátis" : "Entrega " + formatMoney(restaurant.feeCents)}</span></p>
      {hasOffers && <span className="inline-flex rounded bg-success-soft px-2 py-0.5 text-caption text-success">Produtos em oferta</span>}
      <p className="text-caption text-ink-faint">Pedido mínimo {formatMoney(restaurant.minOrderCents)}</p>
    </div>
  </Link>;
}
