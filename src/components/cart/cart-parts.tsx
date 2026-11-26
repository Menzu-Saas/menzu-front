"use client";

import Link from "next/link";
import { TicketPercent } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Icon, Input, Stepper } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import type { OrderQuote } from "@/lib/schemas/order";
import { ProductImage } from "@/components/menu/product-image";
import type { CartLine } from "@/stores/cart";
import { isAddressQuoteError, isTransientQuoteError, type ApiError } from "./use-quote";

/** Cart / side cart: a wrong remembered address is fixed at checkout. */
export const ADDRESS_HINT = "Você pode trocar o endereço no checkout.";

export function addonSummary(line: Pick<CartLine, "variantName" | "addons">): string {
  const parts: string[] = [];
  if (line.variantName) parts.push(line.variantName);
  for (const a of line.addons) parts.push(`${a.quantity > 1 ? `${a.quantity}× ` : ""}${a.name}`);
  return parts.length ? `+ ${parts.join(", ")}` : "";
}

/** Cart row (reference 05): image 64, name, add-ons, price, small stepper, Remover. */
export function CartLineRow({
  line,
  totalCents,
  onQty,
  onRemove,
  onEdit,
  unavailable = null,
}: {
  line: CartLine;
  /** Server line total when quoted; falls back to the local estimate. */
  totalCents: number | null;
  onQty: (qty: number) => void;
  onRemove: () => void;
  onEdit?: () => void;
  unavailable?: string | null;
}) {
  const extra = addonSummary(line);
  return (
    <li className="flex flex-wrap gap-3 sm:flex-nowrap">
      <ProductImage url={line.imageUrl} alt={line.name} className="size-16 shrink-0 rounded-2xl" sizes="64px" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {onEdit ? (
          <button type="button" onClick={onEdit} className="text-left text-body font-bold text-ink hover:text-brand">
            {line.name}
          </button>
        ) : (
          <p className="text-body font-bold text-ink">{line.name}</p>
        )}
        {extra && <p className="text-caption text-ink-muted">{extra}</p>}
        {line.notes && <p className="text-caption text-ink-faint">Obs.: {line.notes}</p>}
        {unavailable && <p className="text-caption font-semibold text-danger">{unavailable}</p>}
        <p className="text-body font-extrabold text-ink">{formatMoney(totalCents ?? line.unitPriceCents * line.quantity)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Stepper value={line.quantity} onChange={onQty} min={0} max={99} label={`Quantidade de ${line.name}`} />
        <button type="button" aria-label={`Remover ${line.name}`} onClick={onRemove} className="min-h-11 text-caption font-bold text-ink-faint hover:text-danger">
          Remover
        </button>
      </div>
    </li>
  );
}

/** Compact row for the desktop side cart (reference W2): image 52, "1×". */
export function SideCartLineRow({ line, totalCents, onEdit, onQty, onRemove, unavailable = null }: { line: CartLine; totalCents: number | null; onEdit: () => void; onQty: (qty: number) => void; onRemove: () => void; unavailable?: string | null }) {
  const extra = addonSummary(line);
  return (
    <li>
      <button
        type="button"
        onClick={onEdit}
        className="group flex w-full gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ProductImage url={line.imageUrl} alt={line.name} className="size-13 shrink-0 rounded-xl" sizes="52px" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-sm font-bold text-ink group-hover:text-brand">{line.name}</span>
          {extra && <span className="truncate text-micro font-normal text-ink-muted">{extra}</span>}
          {line.notes && <span className="text-caption text-ink-muted">Obs.: {line.notes}</span>}
          {unavailable && <span className="text-caption font-semibold text-danger">{unavailable}</span>}
          <span className="text-body-sm font-extrabold text-ink">{formatMoney(totalCents ?? line.unitPriceCents * line.quantity)}</span>
        </span>
        <span className="text-caption font-bold text-ink-faint">{line.quantity}×</span>
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Stepper value={line.quantity} onChange={onQty} min={0} max={99} label={`Quantidade de ${line.name}`} />
        <button type="button" aria-label={`Editar ${line.name}`} onClick={onEdit} className="min-h-11 text-caption font-bold text-brand">Editar</button>
        <button type="button" aria-label={`Remover ${line.name}`} onClick={onRemove} className="min-h-11 text-caption font-bold text-ink-faint hover:text-danger">Remover</button>
      </div>
    </li>
  );
}

export function CartMinimum({ missingCents, menuHref, deliveryPending, onContinue }: { missingCents: number | null; menuHref: string; deliveryPending: boolean; onContinue?: () => void }) {
  if (!missingCents || missingCents <= 0) return null;
  return <div role="status" className="space-y-2 rounded-xl border border-brand-soft-border bg-brand-tint p-3 text-body-sm text-ink">
    <p>Faltam <strong>{formatMoney(missingCents)}</strong> para o pedido mínimo{deliveryPending ? " da loja" : ""}.</p>
    {deliveryPending && <p className="text-caption text-ink-muted">O mínimo da sua região será confirmado com o endereço.</p>}
    {onContinue ? <button type="button" onClick={onContinue} className="min-h-11 font-bold text-brand">Continuar comprando</button> : <Link href={menuHref} className="inline-flex min-h-11 items-center font-bold text-brand">Continuar comprando</Link>}
  </div>;
}

/**
 * Coupon field → applied state (dashed brand box, "Você economizou"). A coupon the server rejects is
 * removed from the cart and the reason shown under the field.
 */
export function CouponBox({
  couponCode,
  setCoupon,
  quote,
  quoteCoupon,
  loading,
  quoteError = null,
  pendingText = "Será validado quando o pedido estiver completo.",
  compact = false,
  render = (content) => content,
}: {
  couponCode: string | null;
  setCoupon: (code: string | null) => void;
  quote: OrderQuote | null;
  /** Coupon code the current quote was requested with. */
  quoteCoupon: string | null;
  loading: boolean;
  /** Current quote error: the coupon cannot be validated until it is solved. */
  quoteError?: ApiError | null;
  /** Shown while there is no quote to validate the coupon against. */
  pendingText?: string;
  compact?: boolean;
  render?: (content: import('react').ReactNode, status: { applied: boolean; error: string | null }) => import('react').ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !quote || !couponCode || quoteCoupon !== couponCode) return;
    if (quote.coupon_error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reflecting the server verdict
      setError(quote.coupon_error.message || "Cupom inválido.");
      setDraft(couponCode);
      setCoupon(null);
    }
  }, [quote, couponCode, quoteCoupon, loading, setCoupon]);

  const applied = Boolean(couponCode && !quoteError && quote?.coupon && quote.coupon.code.toUpperCase() === couponCode);
  const validating = !applied && loading;

  if (couponCode) {
    return render(
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-brand-dashed bg-brand-tint p-3.5">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-white">
          <Icon icon={TicketPercent} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-bold text-ink">
            <span className="font-mono">{couponCode}</span> {applied ? "aplicado" : validating ? "…" : ""}
          </p>
          {applied && quote && quote.discount_cents > 0 && (
            <p className="text-caption font-semibold text-success">Você economizou {formatMoney(quote.discount_cents)}</p>
          )}
          {validating && <p className="text-caption text-ink-muted">Validando cupom…</p>}
          {!applied && !validating && <p className="text-caption text-ink-muted">{pendingText}</p>}
        </div>
        <button type="button" onClick={() => setCoupon(null)} className="text-caption font-bold text-ink-faint hover:text-danger">
          Remover
        </button>
      </div>, { applied, error },
    );
  }

  return render(
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const code = draft.trim().toUpperCase();
        if (!code) return;
        setError(null);
        setCoupon(code);
      }}
    >
      <label htmlFor={compact ? "coupon-side" : "coupon"} className="sr-only">
        Cupom de desconto
      </label>
      {/* The desktop side cart is a narrow column below xl: stack field and button there. */}
      <div className={cn("flex gap-2", compact && "flex-col xl:flex-row")}>
        <Input
          id={compact ? "coupon-side" : "coupon"}
          size={compact ? "md" : "lg"}
          leftIcon={TicketPercent}
          placeholder={compact ? "Cupom" : "Cupom de desconto"}
          value={draft}
          maxLength={20}
          autoCapitalize="characters"
          invalid={Boolean(error)}
          wrapperClassName="min-w-0"
          className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
        />
        <Button type="submit" variant="outline" size={compact ? "md" : "lg"} disabled={!draft.trim()}>
          Aplicar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-caption font-semibold text-danger">
          {error}
        </p>
      )}
    </form>, { applied, error },
  );
}

/** Subtotal / Entrega / Cupom / Total from the server quote (reference 05, W2, W3). */
export function QuoteBreakdown({
  quote,
  error,
  loading,
  deliveryPending,
  pendingLabel = "Calculada no checkout",
  isDelivery,
  missingCents,
  totalSize = "md",
  hideConfirmedTotal = false,
  itemsCount,
  onRetry,
  retrying = false,
  estimate,
  couponPending = false,
  addressHint,
  className,
}: {
  quote: OrderQuote | null;
  error: ApiError | null;
  loading: boolean;
  deliveryPending: boolean;
  /** Text of the Entrega row while the fee is unknown (no complete address yet). */
  pendingLabel?: string;
  isDelivery: boolean;
  /** Amount still missing for the minimum order (BELOW_MINIMUM), from the server's answer. */
  missingCents?: number | null;
  /** Retries a transient failure (network, 429) right away. */
  onRetry?: () => void;
  /** An automatic retry is scheduled. */
  retrying?: boolean;
  /** No server quote is possible yet (delivery-only, address unknown): show the local estimate. */
  estimate?: { subtotalCents: number; minOrderCents: number } | null;
  couponPending?: boolean;
  totalSize?: "md" | "lg";
  hideConfirmedTotal?: boolean;
  itemsCount?: number;
  /** Extra line under an address error (OUT_OF_DELIVERY_AREA / ADDRESS_REQUIRED). */
  addressHint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.25", loading && "opacity-60 transition-opacity", className)} aria-busy={loading}>
      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-3 text-body-sm text-danger">
          {error.message}
          {error.code === "BELOW_MINIMUM" && missingCents != null && missingCents > 0 && (
            <span className="block font-normal">Faltam {formatMoney(missingCents)} para fechar o pedido.</span>
          )}
          {addressHint && isAddressQuoteError(error) && <span className="block font-normal">{addressHint}</span>}
          {isTransientQuoteError(error) && onRetry && (
            <span className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="font-bold text-danger underline underline-offset-2 disabled:opacity-60"
              >
                Tentar de novo
              </button>
              {(retrying || loading) && <span className="text-caption font-normal">Tentando de novo…</span>}
            </span>
          )}
        </div>
      )}
      {!quote && estimate && (
        <>
          <Row label="Subtotal (estimado)">
            <span className="font-semibold text-ink-secondary">{formatMoney(estimate.subtotalCents)}</span>
          </Row>
          {isDelivery && (
            <Row label="Entrega">
              <span className="font-semibold text-ink-faint">{pendingLabel}</span>
            </Row>
          )}
          <Row label="Descontos"><span className="font-semibold text-ink-faint">{couponPending ? "A confirmar" : formatMoney(0)}</span></Row>
          <div className={cn("flex justify-between gap-3 text-ink", totalSize === "lg" ? "text-heading" : "text-subheading")}>
            <span>{isDelivery ? "Total estimado sem entrega" : "Total estimado"}</span>
            <span className="shrink-0 whitespace-nowrap tabular-nums">{formatMoney(estimate.subtotalCents)}</span>
          </div>
          <p className="text-caption text-ink-faint">
            {couponPending ? "Total antes do cupom. " : ""}Valores confirmados pelo restaurante{isDelivery ? ", com o endereço de entrega" : ""}
            {estimate.minOrderCents > 0 ? ` · pedido mínimo ${formatMoney(estimate.minOrderCents)}` : ""}.
          </p>
        </>
      )}
      {quote && (
        <>
          <Row label={itemsCount != null ? `${itemsCount === 1 ? "1 item" : `${itemsCount} itens`}` : "Subtotal"}>
            <span className="font-semibold text-ink-secondary">{formatMoney(quote.subtotal_cents)}</span>
          </Row>
          {isDelivery && (
            <Row label="Entrega">
              {deliveryPending ? (
                <span className="font-semibold text-ink-faint">{pendingLabel}</span>
              ) : quote.delivery_fee_cents === 0 ? (
                <span className="font-bold text-success">Grátis</span>
              ) : (
                <span className="font-semibold text-ink-secondary">{formatMoney(quote.delivery_fee_cents)}</span>
              )}
            </Row>
          )}
          <Row label={quote.coupon ? <>Cupom <span className="font-mono">{quote.coupon.code}</span></> : "Descontos"}>
            <span className={cn("font-semibold", quote.discount_cents > 0 ? "text-success" : "text-ink-secondary")}>{quote.discount_cents > 0 ? "− " : ""}{formatMoney(quote.discount_cents)}</span>
          </Row>
          {!hideConfirmedTotal && <div className={cn("flex justify-between gap-3 text-ink", totalSize === "lg" ? "text-heading" : "text-subheading")}>
            <span>{isDelivery && deliveryPending ? "Total sem entrega" : "Total"}</span>
            <span className="shrink-0 whitespace-nowrap tabular-nums">{formatMoney(quote.total_cents)}</span>
          </div>}
        </>
      )}
      {!quote && !error && loading && <p role="status" className="text-body-sm text-ink-faint">{estimate ? "Atualizando valores…" : "Calculando…"}</p>}
    </div>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-body-sm font-normal text-ink-muted">
      <span>{label}</span>
      <span className="shrink-0 whitespace-nowrap tabular-nums">{children}</span>
    </div>
  );
}
