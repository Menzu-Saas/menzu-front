"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, ImagePlaceholder, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

export interface ProductCardData {
  id: string;
  name: string;
  image_url: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  is_available: boolean;
  stock_quantity: number | null;
  status: "ACTIVE" | "ARCHIVED";
  addons: number;
  sales: number;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Reference P3 product card: r18, 118px image (or food stripes), 14/700 name, meta, price + availability switch. */
export function ProductCard({
  product,
  href,
  onToggle,
}: {
  product: ProductCardData;
  href: string;
  onToggle: (available: boolean) => void;
}) {
  const soldOut = product.stock_quantity === 0;
  const preview = product.id.startsWith("preview:");
  const CardContent = preview ? "div" : Link;
  const unavailable = !product.is_available || soldOut || product.status === "ARCHIVED";
  const meta = soldOut
    ? "sem estoque"
    : `${plural(product.addons, "adicional", "adicionais")} · ${plural(product.sales, "venda", "vendas")}`;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-[border-color,opacity] duration-150 ease-out hover:border-line-strong",
        unavailable && "opacity-65",
      )}
    >
      <CardContent href={preview ? "" : href} className="group/card flex flex-col focus-visible:-outline-offset-2" aria-label={preview ? undefined : `Editar ${product.name}`}>
        <div className="relative h-29.5 w-full overflow-hidden">
          {unavailable ? (
            <div className="mz-stripes-off flex h-full items-center justify-center text-micro font-extrabold text-ink-subtle">
              {product.status === "ARCHIVED" ? "ARQUIVADO" : "INDISPONÍVEL"}
            </div>
          ) : product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Storage public URL, sized by CSS
            <img src={product.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <ImagePlaceholder kind="food" label="Foto do prato" className="h-full w-full" />
          )}
          {product.promo_price_cents !== null && !unavailable && (
            <Badge tone="brand" size="sm" className="absolute top-2.5 left-2.5">
              PROMO
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-2 px-3.5 pt-3.5">
          <h3 className="truncate text-body font-bold text-ink group-hover/card:text-brand">{product.name}</h3>
          <p className="text-caption text-ink-muted">{preview ? "Prato de demonstração" : meta}</p>
        </div>
      </CardContent>
      <div className="flex items-center justify-between gap-2 px-3.5 pt-2 pb-3.5">
        <span className="flex items-baseline gap-1.5">
          <span className="text-item font-extrabold text-ink">
            {formatMoney(product.promo_price_cents ?? product.price_cents)}
          </span>
          {product.promo_price_cents !== null && (
            <span className="text-caption text-ink-disabled line-through">{formatMoney(product.price_cents)}</span>
          )}
        </span>
        <Switch
          checked={product.is_available}
          onCheckedChange={onToggle}
          disabled={preview || product.status === "ARCHIVED"}
          aria-label={product.is_available ? `Pausar ${product.name}` : `Disponibilizar ${product.name}`}
        />
      </div>
    </article>
  );
}

/** Dashed "Novo item em {categoria}" placeholder card. */
export function NewProductCard({ href, categoryName }: { href: string; categoryName: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-50 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line-strong p-4 text-center",
        "transition-[border-color,background-color] duration-150 ease-out hover:border-brand-tint-border hover:bg-brand-tint",
      )}
    >
      <span className="inline-flex size-9.5 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Plus size={20} strokeWidth={2.1} aria-hidden="true" />
      </span>
      <span className="text-body-sm font-bold text-ink-muted">Novo item em {categoryName}</span>
    </Link>
  );
}
