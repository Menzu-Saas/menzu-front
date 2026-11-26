"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderType } from "@/lib/order-status";
import type { OrderQuote } from "@/lib/schemas/order";
import type { CartLine } from "@/stores/cart";

export type QuoteAddress = {
  latitude?: number;
  longitude?: number;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state?: string;
  reference?: string;
};

export type ApiError = {
  code: string;
  message: string;
  /** Network failure, rate limit or server hiccup: the same payload may succeed later. */
  transient?: boolean;
  /** Seconds the server asked us to wait (`Retry-After`, 429). */
  retryAfter?: number;
  /** BELOW_MINIMUM: effective minimum (restaurant or zone) and server subtotal, when the API sends them. */
  minimum_cents?: number;
  subtotal_cents?: number;
};

/** Cart lines → API items (ids, quantities and notes only; prices never travel). */
export function toPayloadItems(items: CartLine[]) {
  return items.map((i) => ({
    product_id: i.productId,
    variant_id: i.variantId,
    quantity: i.quantity,
    ...(i.notes ? { notes: i.notes.slice(0, 140) } : {}),
    addons: i.addons.map((a) => ({ option_id: a.optionId, quantity: a.quantity })),
  }));
}

export function isAddressComplete(a: Partial<QuoteAddress> | null | undefined): a is QuoteAddress {
  return Boolean(
    a && (a.cep ?? "").replace(/\D/g, "").length === 8 && a.street?.trim() && a.number?.trim() && a.neighborhood?.trim() && a.city?.trim(),
  );
}

export type QuoteRequest = {
  slug: string;
  items: CartLine[];
  type: OrderType;
  tableNumber: number | null;
  couponCode: string | null;
  phone?: string | null;
  address?: Partial<QuoteAddress> | null;
  scheduledFor?: string | null;
  paymentMethod?: string | null;
  acceptsPickup: boolean;
};

/**
 * Builds the quote payload. A DELIVERY cart without a complete address is quoted as PICKUP (when the
 * restaurant offers it) so subtotal, minimum and coupon still come from the server; the delivery fee
 * is then reported as pending.
 */
export function buildQuotePayload(r: QuoteRequest): { payload: Record<string, unknown>; deliveryPending: boolean } | null {
  if (!r.items.length) return null;
  let type: OrderType = r.type;
  let deliveryPending = false;
  if (type === "DELIVERY" && !isAddressComplete(r.address)) {
    if (!r.acceptsPickup) return null;
    type = "PICKUP";
    deliveryPending = true;
  }
  if (type === "DINE_IN" && !r.tableNumber) return null;
  const phone = (r.phone ?? "").replace(/\D/g, "");
  const payload: Record<string, unknown> = {
    restaurant_slug: r.slug,
    type,
    items: toPayloadItems(r.items),
  };
  if (type === "DINE_IN") payload.table_number = r.tableNumber;
  if (type === "DELIVERY") payload.address = r.address;
  if (r.couponCode) payload.coupon_code = r.couponCode;
  if (phone.length >= 10) payload.customer = { name: "Cliente", phone };
  if (r.scheduledFor) payload.scheduled_for = r.scheduledFor;
  if (r.paymentMethod) payload.payment_method = r.paymentMethod;
  return { payload, deliveryPending };
}

export type QuoteState = {
  quote: OrderQuote | null;
  error: ApiError | null;
  loading: boolean;
  /** JSON key of the payload the current quote/error belongs to. */
  key: string | null;
};

const TRANSIENT_CODES = new Set(["NETWORK", "RATE_LIMITED"]);
/** Automatic retries of a transient failure before waiting for the customer ("Tentar de novo"). */
export const QUOTE_MAX_AUTO_RETRIES = 4;

/** Backoff for the n-th automatic retry (0-based): 1s, 2s, 4s, 8s… capped at 30s; honours Retry-After. */
export function quoteRetryDelayMs(attempt: number, retryAfterSeconds?: number): number {
  const backoff = Math.min(1000 * 2 ** attempt, 30_000);
  return retryAfterSeconds && retryAfterSeconds > 0 ? Math.min(Math.max(backoff, retryAfterSeconds * 1000), 60_000) : backoff;
}

export function isTransientQuoteError(e: ApiError | null): boolean {
  return Boolean(e && (e.transient || TRANSIENT_CODES.has(e.code)));
}

/** Errors that block finishing the order (the cart must change first). */
export function isBlockingQuoteError(e: ApiError | null): boolean {
  return Boolean(e && !isTransientQuoteError(e));
}

const ADDRESS_CODES = new Set(["OUT_OF_DELIVERY_AREA", "ADDRESS_REQUIRED"]);

/** The remembered delivery address is the problem: fixable at checkout, where the address is edited. */
export function isAddressQuoteError(e: ApiError | null): boolean {
  return Boolean(e && ADDRESS_CODES.has(e.code));
}

/**
 * Cart / side cart CTA. It only navigates to checkout, which re-quotes and requires a real quote
 * before confirming, so it is allowed with a quote, with the delivery-only estimate, after a
 * transient failure, or when only the address is wrong (the address is changed at checkout).
 */
export function canGoToCheckout(s: {
  hasItems: boolean;
  blocked: boolean;
  loading: boolean;
  hasQuote: boolean;
  estimateOnly: boolean;
  error: ApiError | null;
  missingCents?: number | null;
}): boolean {
  if (!s.hasItems || s.blocked || s.loading || (s.missingCents ?? 0) > 0) return false;
  if (isAddressQuoteError(s.error) || isTransientQuoteError(s.error)) return true;
  return !s.error && (s.hasQuote || s.estimateOnly);
}

export type QuoteResult = QuoteState & {
  currentKey: string | null;
  /** Re-requests the current payload now (after a transient failure). */
  retry: () => void;
  /** An automatic retry is scheduled. */
  retrying: boolean;
};

/**
 * Debounced server quote (`/api/orders/quote`); stale responses are dropped. Transient failures
 * (network, 429, 5xx) are retried automatically with backoff, then wait for `retry()`.
 */
export function useQuote(payload: Record<string, unknown> | null, delay = 350): QuoteResult {
  const currentKey = payload ? JSON.stringify(payload) : null;
  const [state, setState] = useState<QuoteState & { nonce: number }>({ quote: null, error: null, loading: false, key: null, nonce: 0 });
  const [nonce, setNonce] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const latest = useRef<string | null>(null);
  const attempts = useRef<{ key: string | null; n: number }>({ key: null, n: 0 });

  useEffect(() => {
    latest.current = currentKey;
    if (!currentKey) return;
    if (attempts.current.key !== currentKey) attempts.current = { key: currentKey, n: 0 };
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const fail = (error: ApiError) => {
      setState({ quote: null, error, loading: false, key: currentKey, nonce });
      if (!isTransientQuoteError(error) || attempts.current.n >= QUOTE_MAX_AUTO_RETRIES) return;
      const wait = quoteRetryDelayMs(attempts.current.n, error.retryAfter);
      attempts.current.n += 1;
      setRetrying(true);
      retryTimer = setTimeout(() => {
        setRetrying(false);
        setNonce((n) => n + 1);
      }, wait);
    };
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/orders/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: currentKey,
          signal: controller.signal,
        });
        const body = await res.json().catch(() => null);
        if (latest.current !== currentKey || controller.signal.aborted) return;
        if (res.ok) {
          attempts.current.n = 0;
          setState({ quote: body as OrderQuote, error: null, loading: false, key: currentKey, nonce });
          return;
        }
        const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
        const transient = res.status === 429 || res.status >= 500;
        const apiError: ApiError = body?.error ?? { code: "UNKNOWN", message: "Não foi possível calcular o pedido." };
        fail({
          ...apiError,
          ...(transient ? { transient: true, message: transientMessage(apiError, res.status) } : {}),
          ...(retryAfter ? { retryAfter } : {}),
        });
      } catch (e) {
        if (controller.signal.aborted || latest.current !== currentKey) return;
        console.warn("[quote] request failed", e);
        fail({ code: "NETWORK", message: "Sem conexão. Verifique sua internet e tente de novo.", transient: true });
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      controller.abort();
      setRetrying(false);
    };
  }, [currentKey, delay, nonce]);

  const retry = useCallback(() => {
    attempts.current.n = 0;
    setNonce((n) => n + 1);
  }, []);

  // Loading = the latest payload has no answer yet; the previous quote stays visible meanwhile.
  if (!currentKey) return { quote: null, error: null, loading: false, key: null, currentKey, retry, retrying: false };
  const { nonce: answeredNonce, ...rest } = state;
  const loading = state.key !== currentKey || answeredNonce !== nonce;
  return { ...rest, loading, currentKey, retry, retrying: retrying && !loading };
}

function transientMessage(e: ApiError, status: number): string {
  if (status === 429) return "Muitas consultas em pouco tempo. Aguarde um instante.";
  return e.message || "Não foi possível calcular o pedido agora.";
}

/** "Pedido mínimo R$ 1.234,56" (server BELOW_MINIMUM detail) → 123456. */
export function parseMinimumCents(message: string): number | null {
  const m = message.match(/R\$\s*([\d.]+),(\d{2})/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "")) * 100 + Number(m[2]);
}

/**
 * Amount still missing for the minimum order, from the server's BELOW_MINIMUM answer: its numbers
 * when sent, else the effective minimum (restaurant or zone) in its message minus the cart estimate.
 */
export function belowMinimumMissingCents(e: ApiError | null, estimateCents: number): number | null {
  if (!e || e.code !== "BELOW_MINIMUM") return null;
  const min = typeof e.minimum_cents === "number" ? e.minimum_cents : parseMinimumCents(e.message);
  if (min == null) return null;
  const subtotal = typeof e.subtotal_cents === "number" ? e.subtotal_cents : estimateCents;
  const missing = min - subtotal;
  return missing > 0 ? missing : null;
}
