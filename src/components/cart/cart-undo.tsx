"use client";

import type { CartRemoval } from "./use-cart-removal";

export function CartUndo({ removal }: { removal: CartRemoval }) {
  if (!removal.removed) return null;
  return <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-muted px-3 py-2 text-body-sm text-ink">
    <p className="min-w-0">{removal.removed.line.name} removido. Você pode desfazer a última remoção por 8 segundos.</p>
    <button type="button" onClick={removal.undo} className="min-h-11 shrink-0 px-2 font-bold text-brand focus-visible:outline-2 focus-visible:outline-accent">Desfazer</button>
  </div>;
}
