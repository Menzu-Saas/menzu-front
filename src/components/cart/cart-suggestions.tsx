"use client";

import { Plus, Utensils } from "lucide-react";
import { displayPrice } from "@/components/menu/format";
import { ProductImage } from "@/components/menu/product-image";
import { Button, Icon } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import type { PublicMenu, PublicProduct } from "@/server/queries/public-menu";
import type { CartLine } from "@/stores/cart";
import { cartProductOrderable } from "./cart-availability";

export function getCartSuggestions(data: PublicMenu, items: CartLine[]): PublicProduct[] {
  const seen = new Set(items.map((item) => item.productId));
  const suggestions: PublicProduct[] = [];
  for (const menu of data.menus) {
    for (const category of menu.categories) {
      const name = category.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (!/\b(bebidas?|sobremesas?|doces?|acompanhamentos?|porcoes|porcao)\b/.test(name)) continue;
      for (const product of category.products) {
        if (!cartProductOrderable(product) || seen.has(product.id)) continue;
        seen.add(product.id);
        suggestions.push(product);
        if (suggestions.length === 4) return suggestions;
      }
    }
  }
  return suggestions;
}

export function CartSuggestions({ data, items, blocked, onChoose }: {
  data: PublicMenu;
  items: CartLine[];
  blocked: boolean;
  onChoose: (product: PublicProduct) => void;
}) {
  const suggestions = getCartSuggestions(data, items);
  if (!suggestions.length) return null;

  return (
    <section aria-label="Que tal completar seu pedido?" className="min-w-0 border-t border-line pt-4">
      <h2 className="text-body-sm font-bold text-ink">Que tal completar seu pedido?</h2>
      <p className="mt-1 text-caption text-ink-muted">Mais opções do cardápio para acompanhar.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {suggestions.map((product) => {
          const price = displayPrice(product);
          return (
            <li key={product.id} className="flex items-center gap-2.5 rounded-xl bg-surface-sunken p-2.5">
              <span className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-soft text-brand">
                {product.imageUrl ? (
                  <ProductImage url={product.imageUrl} alt="" className="size-full" sizes="40px" />
                ) : <Icon icon={Utensils} size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-caption font-bold text-ink">{product.name}</p>
                <p className="text-caption text-ink-secondary">{price.fromPrefix ? "A partir de " : ""}{formatMoney(price.cents)}</p>
              </div>
              <Button variant="outline" size="sm" disabled={blocked} aria-label={`Adicionar ${product.name}`} onClick={() => onChoose(product)} className="px-2.5">
                <Icon icon={Plus} size={16} />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
