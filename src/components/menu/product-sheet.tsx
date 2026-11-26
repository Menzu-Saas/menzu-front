"use client";

import { useMemo, useState } from "react";
import { BottomSheet, Button, Modal, OptionCard, OptionGroup, Stepper, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { formatMoney } from "@/lib/money";
import type { PublicAddonGroup, PublicProduct } from "@/server/queries/public-menu";
import type { CartAddon, CartLine, NewCartLine } from "@/stores/cart";
import { ProductImage } from "./product-image";

export interface ProductSheetProps {
  product: PublicProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode: the cart line being changed. */
  editing?: CartLine | null;
  /** When set, adding is blocked (restaurant paused/closed) and this message is shown. */
  blockedReason?: string | null;
  onSubmit: (line: NewCartLine) => void;
  onRemove?: () => void;
}

function groupEyebrow(g: PublicAddonGroup): string {
  if (!g.required) return `OPCIONAL · ATÉ ${g.maxSelect}`;
  if (g.minSelect === g.maxSelect) return `OBRIGATÓRIO · ESCOLHA ${g.minSelect}`;
  return `OBRIGATÓRIO · ${g.minSelect} A ${g.maxSelect}`;
}

const isRadioGroup = (g: PublicAddonGroup) =>
  g.minSelect === 1 && g.maxSelect === 1 && g.options.every((o) => o.maxQuantity === 1);

/** Product sheet (reference 04): photo, title, price, variants, add-on groups, notes, qty + add. */
export function ProductSheet({ product, open, onOpenChange, editing, blockedReason, onSubmit, onRemove }: ProductSheetProps) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const [variantId, setVariantId] = useState<string | null>(() => {
    // Edit mode keeps only choices that still exist and are available (the menu may have changed).
    if (editing?.variantId && product.variants.some((v) => v.id === editing.variantId && v.available)) return editing.variantId;
    return product.variants.length === 1 && product.variants[0].available ? product.variants[0].id : null;
  });
  const [picks, setPicks] = useState<Record<string, number>>(() => {
    const options = new Map(product.addonGroups.flatMap((g) => g.options.map((o) => [o.id, o] as const)));
    return Object.fromEntries(
      (editing?.addons ?? []).flatMap((a) => {
        const o = options.get(a.optionId);
        return o && o.available ? [[a.optionId, Math.min(a.quantity, o.maxQuantity)]] : [];
      }),
    );
  });
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);

  const groupSum = (g: PublicAddonGroup) => g.options.reduce((n, o) => n + (picks[o.id] ?? 0), 0);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const base = variant ? variant.priceCents : (product.promoPriceCents ?? product.priceCents);
  const addons: CartAddon[] = useMemo(
    () =>
      product.addonGroups.flatMap((g) =>
        g.options
          .filter((o) => (picks[o.id] ?? 0) > 0)
          .map((o) => ({ optionId: o.id, groupName: g.name, name: o.name, quantity: picks[o.id], priceCents: o.priceCents })),
      ),
    [product.addonGroups, picks],
  );
  const unit = base + addons.reduce((n, a) => n + a.priceCents * a.quantity, 0);

  const missing: string[] = [];
  if (product.variants.length && !variant) missing.push("uma opção");
  for (const g of product.addonGroups) if (groupSum(g) < g.minSelect) missing.push(g.name);
  // Edit mode restores old picks: the owner may have lowered a group's maximum since.
  const excess = product.addonGroups
    .filter((g) => groupSum(g) > g.maxSelect)
    .map((g) => `Remova ${groupSum(g) - g.maxSelect} de ${g.name}`);

  function setPick(optionId: string, qty: number) {
    setPicks((p) => {
      const next = { ...p };
      if (qty > 0) next[optionId] = qty;
      else delete next[optionId];
      return next;
    });
  }

  function setRadio(g: PublicAddonGroup, optionId: string) {
    setPicks((p) => {
      const next = { ...p };
      for (const o of g.options) delete next[o.id];
      next[optionId] = 1;
      return next;
    });
  }

  function submit() {
    if (missing.length || excess.length || blockedReason) return;
    onSubmit({
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      variantName: variant?.name ?? null,
      imageUrl: product.imageUrl,
      quantity,
      notes: notes.trim(),
      addons,
      unitPriceCents: unit,
    });
  }

  const body = (
    <div className="flex flex-col gap-5">
      <ProductImage
        url={product.imageUrl}
        alt={product.name}
        kind="cover"
        sizes="(min-width: 768px) 520px, 100vw"
        className={cn("h-57.5 shrink-0", desktop ? "rounded-3xl" : "-mx-5 -mt-4")}
      />
      <div className="flex flex-col gap-1.5">
        {!desktop && <h2 className="text-title-lg text-ink">{product.name}</h2>}
        {product.description && <p className="text-body-sm leading-normal font-normal text-ink-muted">{product.description}</p>}
        <div className="flex items-baseline gap-2">
          <span className="text-title-md text-brand">{formatMoney(base)}</span>
          {!variant && product.promoPriceCents != null && (
            <span className="text-caption text-ink-disabled line-through">{formatMoney(product.priceCents)}</span>
          )}
        </div>
      </div>

      {product.variants.length > 0 && (
        <section className="flex flex-col gap-2.5" aria-labelledby={`variants-${product.id}`}>
          <GroupHeader id={`variants-${product.id}`} title="Escolha uma opção" eyebrow="OBRIGATÓRIO · ESCOLHA 1" />
          <OptionGroup value={variantId} onValueChange={setVariantId} aria-label="Opções do produto">
            {product.variants.map((v) => (
              <OptionCard key={v.id} value={v.id} disabled={!v.available} trailing={formatMoney(v.priceCents)}>
                {v.name}
                {!v.available && <span className="ml-1.5 text-caption text-ink-faint">· indisponível</span>}
              </OptionCard>
            ))}
          </OptionGroup>
        </section>
      )}

      {product.addonGroups.map((g) => {
        const sum = groupSum(g);
        const remaining = g.maxSelect - sum;
        const headerId = `group-${g.id}`;
        return (
          <section key={g.id} className="flex flex-col gap-2.5" aria-labelledby={headerId}>
            <GroupHeader id={headerId} title={g.name} eyebrow={groupEyebrow(g)} />
            {isRadioGroup(g) ? (
              <OptionGroup
                value={g.options.find((o) => picks[o.id])?.id ?? null}
                onValueChange={(id) => setRadio(g, id)}
                aria-label={g.name}
              >
                {g.options.map((o) => (
                  <OptionCard key={o.id} value={o.id} disabled={!o.available} trailing={o.priceCents ? `+ ${formatMoney(o.priceCents)}` : null}>
                    {o.name}
                  </OptionCard>
                ))}
              </OptionGroup>
            ) : (
              <div className="flex flex-col gap-2.5">
                {g.options.map((o) => {
                  const qty = picks[o.id] ?? 0;
                  const price = o.priceCents ? `+ ${formatMoney(o.priceCents)}` : null;
                  if (o.maxQuantity > 1) {
                    return (
                      <div
                        key={o.id}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-body text-ink",
                          qty > 0 ? "border-selected-accent bg-brand-tint" : "border border-line",
                          !o.available && "opacity-50",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          {o.name}
                          {price && <span className="block text-caption font-bold text-ink-secondary">{price}</span>}
                        </span>
                        <Stepper
                          value={qty}
                          onChange={(n) => setPick(o.id, n)}
                          min={0}
                          max={Math.min(o.maxQuantity, qty + Math.max(remaining, 0))}
                          disabled={!o.available}
                          label={`Quantidade de ${o.name}`}
                        />
                      </div>
                    );
                  }
                  return (
                    <OptionCard
                      key={o.id}
                      control="checkbox"
                      selected={qty > 0}
                      disabled={!o.available || (qty === 0 && remaining <= 0)}
                      onSelect={() => setPick(o.id, qty > 0 ? 0 : 1)}
                      trailing={price}
                    >
                      {o.name}
                    </OptionCard>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <section className="flex flex-col gap-2">
        <label htmlFor={`notes-${product.id}`} className="text-item font-extrabold text-ink">
          Observações
        </label>
        <Textarea
          id={`notes-${product.id}`}
          value={notes}
          maxLength={140}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: sem cebola, molho à parte…"
        />
      </section>
    </div>
  );

  const message =
    blockedReason ?? (missing.length ? `Falta escolher: ${missing.join(", ")}` : excess.length ? `${excess.join(" · ")}.` : null);
  const footer = (
    <div className="flex w-full flex-col gap-2.5">
      {message && (
        <p role="status" className={cn("text-caption font-semibold", blockedReason ? "text-danger" : "text-brand")}>
          {message}
        </p>
      )}
      <div className="flex w-full items-center gap-3">
        <Stepper value={quantity} onChange={setQuantity} min={1} max={99} size="lg" />
        <Button size="xl" className="min-w-0 flex-1" disabled={missing.length > 0 || excess.length > 0 || Boolean(blockedReason)} onClick={submit}>
          <span className="truncate">
            {editing ? "Atualizar" : "Adicionar"} · {formatMoney(unit * quantity)}
          </span>
        </Button>
      </div>
      {editing && onRemove && (
        <button type="button" onClick={onRemove} className="self-center text-caption font-bold text-ink-faint hover:text-danger">
          Remover do carrinho
        </button>
      )}
    </div>
  );

  if (desktop) {
    return (
      <Modal open={open} onOpenChange={onOpenChange} title={product.name} footer={footer} size="md">
        {body}
      </Modal>
    );
  }
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={product.name} hideTitle footer={footer}>
      {body}
    </BottomSheet>
  );
}

function GroupHeader({ id, title, eyebrow }: { id: string; title: string; eyebrow: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 id={id} className="text-item font-extrabold text-ink">
        {title}
      </h3>
      <span className="shrink-0 text-micro text-ink-faint">{eyebrow}</span>
    </div>
  );
}
