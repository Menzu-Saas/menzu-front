"use client";

import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { otherCartStores } from "@/stores/cart";

export function useSingleShopCart() {
  const [pending, setPending] = useState<{ slug: string; add: () => void } | null>(null);

  function addToCart(slug: string, add: () => void) {
    if (otherCartStores(slug).length) setPending({ slug, add });
    else add();
  }

  const confirmation = <ConfirmationDialog
    open={pending !== null}
    onOpenChange={(open) => { if (!open) setPending(null); }}
    title="Você só pode comprar de uma loja por vez"
    description="Quer esvaziar a sacola das outras lojas e adicionar os itens desta loja?"
    confirmLabel="Esvaziar sacola e adicionar"
    onConfirm={async () => {
      if (!pending) return;
      for (const store of otherCartStores(pending.slug)) store.getState().clear();
      pending.add();
    }}
  />;

  return { addToCart, confirmation };
}
