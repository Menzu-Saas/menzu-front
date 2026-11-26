"use client";

import Link from "next/link";
import styles from "./checkout-layout.module.css";
import { Logo } from "@/components/ui/logo";
import { notify } from "@/components/ui/toast";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { isUuid } from "@/lib/uuid";
import { loadCheckoutDraft, saveCheckoutDraft, clearCheckoutDraft, canRestoreDraftAddress } from "./checkout-draft";
import { checkoutAttempt, clearCheckoutAttempt, loadCheckoutAttempt, saveCheckoutAttempt, type CheckoutAttempt } from "./checkout-attempt";
import { lookupQueuedOrder, submitQueuedOrder } from "./submit-queued-order";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  TicketPercent,
  CircleAlert,
  Clock,
  FlaskConical,
  MapPin,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { addonSummary, CouponBox, QuoteBreakdown } from "@/components/cart/cart-parts";
import { menuHref } from "@/components/cart/cart-view";
import {
  belowMinimumMissingCents,
  buildQuotePayload,
  isAddressQuoteError,
  isBlockingQuoteError,
  toPayloadItems,
  useQuote,
  type ApiError,
  type QuoteAddress,
} from "@/components/cart/use-quote";
import { deliveryRange } from "@/components/menu/format";
import { NEEDS_TABLE_REASON, needsTable } from "@/components/menu/menu-view";
import {
  Button,
  Card,
  EmptyState,
  FormField,
  Icon,
  IconButton,
  OptionCard,
  ResponsiveSheet,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { interactive } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import { scheduleSlots, type OpenState } from "@/lib/opening-hours";
import type { OrderType } from "@/lib/order-status";
import { maskPhone, isValidBrPhone, onlyDigits } from "@/lib/phone";
import type { PaymentMethod } from "@/lib/types";
import type { CardType } from "@/lib/schemas/order";
import { couponHeadline, formatMoneyCompact, publicCouponBlock, type PublicCoupon } from "@/lib/schemas/coupon";
import type { PublicPaymentMode, PublicRestaurant } from "@/server/queries/public-menu";
import { cartEstimate, useCart } from "@/stores/cart";
import { clearCustomer, loadCustomer, saveCustomer } from "./customer-storage";
import type { CheckoutCustomer } from "@/lib/checkout-customer";
import { formatCpf, isValidCpf } from "@/lib/cpf";
import { saveBuyerCpfAction } from "@/server/actions/buyer-cpf";
import { SummaryCard } from "./summary-card";
import { AddressPanel } from "./address-panel";
import { addressFromDevice } from "./device-location";
import { CustomerPanel } from "./customer-panel";
import { PaymentPanel, METHOD_ICON, paymentLabel } from "./payment-panel";
import { clearSavedAddresses, loadRecentCoupons, loadSavedAddresses, loadSelectedAddress, rememberCoupon } from "./checkout-preferences";

type Address = Required<Pick<QuoteAddress, "cep" | "street" | "number" | "neighborhood" | "city">> & {
  complement: string;
  state: string;
  reference: string;
};
const EMPTY_ADDRESS: Address = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", reference: "" };

type FieldErrors = Partial<Record<"name" | "phone" | "email" | "cep" | "street" | "number" | "neighborhood" | "city" | "slot" | "change" | "payment" | "cpf", string>>;

const ONLINE: PaymentMethod[] = ["PIX", "CARD_ONLINE"];

/** Sections a returning customer sees as summary cards ("Alterar" reopens the fields). */
type SectionKey = "customer" | "address" | "payment";
type Editing = Record<SectionKey, boolean>;
const SECTION_OF: Record<keyof FieldErrors, SectionKey | null> = {
  name: "customer",
  phone: "customer",
  email: "customer",
  cep: "address",
  street: "address",
  number: "address",
  neighborhood: "address",
  city: "address",
  slot: null,
  change: "payment",
  payment: "payment",
  cpf: "customer",
};

/** Sections holding at least one of these errors. */
function sectionsWithErrors(e: FieldErrors): Partial<Editing> {
  const open: Partial<Editing> = {};
  for (const [field, message] of Object.entries(e)) {
    const section = message ? SECTION_OF[field as keyof FieldErrors] : null;
    if (section) open[section] = true;
  }
  return open;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;



function maskCep(v: string): string {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Fields the API error codes point at, for inline highlighting. */
const ERROR_FIELD: Record<string, keyof FieldErrors> = {
  INVALID_CUSTOMER: "phone",
  PAYER_EMAIL_REQUIRED: "email",
  CPF_REQUIRED: "cpf",
  ADDRESS_REQUIRED: "street",
  OUT_OF_DELIVERY_AREA: "neighborhood",
  INVALID_CHANGE: "change",
  INVALID_SCHEDULE: "slot",
  OUTSIDE_HOURS: "slot",
  SCHEDULING_DISABLED: "slot",
  PAYMENT_METHOD_DISABLED: "payment",
};

function rejectedOrder(status: number, code: string) {
  return code === "QUEUE_FULL" || code === "ORDER_CANCELLED" || code === "QUEUE_EXPIRED" ||
    (status >= 400 && status < 500 && ![401, 404, 429].includes(status) && code !== "IDEMPOTENCY_CONFLICT");
}

const NETWORK_ERROR = { code: "NETWORK", message: "Sem conexão. Verifique sua internet e tente de novo." };

export interface CheckoutViewProps {
  orderingAvailable?: boolean;
  buyerId: string;
  customer?: CheckoutCustomer | null;
  restaurant: PublicRestaurant;
  openState: OpenState;
  paymentMode: PublicPaymentMode;
  /** Estado do CPF do comprador (só os 3 últimos dígitos chegam ao navegador). */
  cpf?: { signedIn: boolean; last3: string | null };
  /** `?agendar=1` (from "Agendar pedido"): start on Agendar. */
  preferSchedule?: boolean;
  /** Coupons the restaurant chose to show in the coupon sheet. */
  publicCoupons?: PublicCoupon[];
}

/** /cardapio/[slug]/checkout — reference 06 (mobile) and W3 (desktop). */
export function CheckoutView({ buyerId, customer, restaurant: r, openState, paymentMode, cpf, preferSchedule = false, orderingAvailable = false, publicCoupons = [] }: CheckoutViewProps) {
  const router = useRouter();
  const [cpfLast3, setCpfLast3] = useState<string | null>(cpf?.last3 ?? null);
  const [cpfDevice, setCpfDevice] = useState("");
  const attempt = useRef<CheckoutAttempt | null>(null);
  const submissionActive = useRef(false);
  const statusRequest = useRef<AbortController | null>(null);
  const cart = useCart(r.slug);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [when, setWhen] = useState<"now" | "schedule">(openState.kind === "open" && !preferSchedule ? "now" : "schedule");
  const [dateKey, setDateKey] = useState<string>("");
  const [slotIso, setSlotIso] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [cardType, setCardType] = useState<CardType>("CREDIT");
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [cutlery, setCutlery] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [statusError, setStatusError] = useState<ApiError | null>(null);
  const [pendingAttempt, setPendingAttempt] = useState<CheckoutAttempt | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [queued, setQueued] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [confirmedChecks, setConfirmedChecks] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const [panel, setPanel] = useState<SectionKey | "coupon" | null>(null);
  const [recentCoupons, setRecentCoupons] = useState<string[]>([]);
  const [restoredFor, setRestoredFor] = useState<string | null>(null);
  const scope = buyerId + ":" + r.slug;
  const [returning, setReturning] = useState(false);

  const resumeAttempt = useEffectEvent(() => { void consultAttempt(); });
  useEffect(() => {
    const saved = loadCheckoutAttempt(buyerId, r.slug);
    attempt.current = saved;
    /* eslint-disable react-hooks/set-state-in-effect -- restore this restaurant's pending attempt after mount */
    setPendingAttempt(saved?.pending ? saved : null);
    setCanResend(false);
    setStatusError(null);
    setCheckingStatus(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    resumeAttempt();
    const onOnline = () => resumeAttempt();
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      statusRequest.current?.abort();
      statusRequest.current = null;
    };
  }, [buyerId, r.slug]);

  // Remembered customer + "now" are client-only (localStorage / clock): read after mount.
  useEffect(() => {
    const remembered = loadCustomer();
    const c = remembered?.buyerId === buyerId ? remembered : null;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore after mount */
    setName(""); setPhone(""); setEmail(""); setCpfDevice(""); setAddress({ ...EMPTY_ADDRESS, ...loadSelectedAddress() }); setMethod(null); setCardType("CREDIT"); setChangeFor(""); setNotes(""); setCutlery(false); setDeliveryInstructions(""); setReturning(false); setErrors({}); setPanel(null);
    if (c) {
      setName(c.name);
      setPhone(maskPhone(c.phone));
      setEmail(c.email);
      setCpfDevice(c.cpf ?? "");
      setMethod(c.paymentMethod ?? null);
      setCardType(c.cardType ?? "CREDIT");
      setChangeFor(c.changeForCents ? centsToInput(c.changeForCents) : "");
      setReturning(true);
    }
    if (customer) {
      if (customer.name) setName(customer.name);
      if (customer.phone) setPhone(maskPhone(customer.phone));
      if (customer.email) setEmail(customer.email);
      setReturning(Boolean(customer.name && customer.phone));
    }
    // An explicitly selected region takes precedence; never keep a house number from another address.
    const selected = loadSelectedAddress();
    const matchesSelection = (address: Partial<Address>) => !selected.cep || (
      onlyDigits(selected.cep) === onlyDigits(address.cep ?? "")
      && (!selected.street || selected.street.trim().toLowerCase() === address.street?.trim().toLowerCase())
    );
    const savedAddress = [customer?.address, ...loadSavedAddresses(buyerId), buyerId === "guest" ? null : c?.address]
      .find((address) => address && matchesSelection(address));
    setAddress({ ...EMPTY_ADDRESS, ...(savedAddress ?? selected) });
    const draft = loadCheckoutDraft(buyerId, r.slug);
    if (draft) {
      if (buyerId !== "guest") {
        setName(draft.name);
        setPhone(draft.phone);
        setEmail(draft.email);
        if (canRestoreDraftAddress(draft)) setAddress({ ...EMPTY_ADDRESS, ...draft.address });
      }
      setWhen(draft.when);
      setDateKey(draft.dateKey);
      setSlotIso(draft.slotIso);
      setMethod(draft.method);
      setCardType(draft.cardType ?? "CREDIT");
      setChangeFor(draft.changeFor);
      setNotes(draft.notes);
      setCutlery(draft.cutlery ?? false);
      setDeliveryInstructions(draft.deliveryInstructions ?? "");
    }
    setNow(new Date());
    setRestoredFor(scope);
    setRecentCoupons(loadRecentCoupons(buyerId, r.slug));
    /* eslint-enable react-hooks/set-state-in-effect */
    // Keep the schedule slots valid while the customer fills the form (prep margin moves with time).
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, [buyerId, customer, r.slug, scope]);

  const type = cart.type;
  const isDelivery = type === "DELIVERY";

  // Delivery: the browser asks for the location as soon as the checkout opens (and again when the buyer
  // switches to delivery). With no address yet, the position fills it (street, neighborhood, city, CEP and
  // the exact point) and the buyer only confirms the number. With an address already on screen, the found
  // address is offered as a suggestion instead of replacing it. Denied or failed lookups are always explained.
  const [locationStatus, setLocationStatus] = useState<{ busy: boolean; message: string }>({ busy: false, message: "" });
  const [addressFromGps, setAddressFromGps] = useState(false);
  const [locationSuggestion, setLocationSuggestion] = useState<{ address: Partial<Address>; located: boolean } | null>(null);
  const locationAsked = useRef(false);
  function applyLocation(found: Partial<Address>, located: boolean) {
    setAddress({ ...EMPTY_ADDRESS, ...found, number: found.number ?? "" });
    setAddressFromGps(located);
    setLocationSuggestion(null);
    setErrors((current) => ({ ...current, cep: undefined, street: undefined, number: undefined, neighborhood: undefined, city: undefined }));
    setLocationStatus({ busy: false, message: found.number ? "Endereço preenchido pela sua localização. Confira o número." : "Endereço preenchido pela sua localização. Informe o número." });
  }
  /** `replace`: the buyer asked for it (button), so the current address gives way. */
  async function fillFromDeviceLocation(replace: boolean) {
    setLocationStatus({ busy: true, message: "Buscando sua localização…" });
    setLocationSuggestion(null);
    const result = await addressFromDevice();
    if (!result.ok) { setLocationStatus({ busy: false, message: result.message }); return; }
    if (replace || !address.street.trim()) { applyLocation(result.address, result.located); return; }
    const same = (result.address.street ?? "").trim().toLowerCase() === address.street.trim().toLowerCase()
      && (result.address.city ?? "").trim().toLowerCase() === address.city.trim().toLowerCase();
    if (same) { setLocationStatus({ busy: false, message: "" }); return; }
    setLocationSuggestion({ address: result.address, located: result.located });
    setLocationStatus({ busy: false, message: "" });
  }
  const autoLocate = useEffectEvent(() => { void fillFromDeviceLocation(false); });
  useEffect(() => {
    if (!isDelivery) { locationAsked.current = false; return; }
    if (restoredFor !== scope || locationAsked.current) return;
    locationAsked.current = true;
    const timer = window.setTimeout(autoLocate, 0);
    return () => window.clearTimeout(timer);
  }, [restoredFor, scope, isDelivery]);

  const methods = useMemo(
    // Pix and card only when this deployment can really charge them (Asaas selected, enabled, account ready).
    () => r.paymentMethods.filter((m): m is Exclude<PaymentMethod, "CARD_ON_DELIVERY"> => m !== "CARD_ON_DELIVERY" && (paymentMode.onlineAvailable || !ONLINE.includes(m))),
    [r.paymentMethods, paymentMode.onlineAvailable],
  );
  const selectedMethod = method && method !== "CARD_ON_DELIVERY" && methods.includes(method) ? method : (methods[0] ?? null);
  const online = selectedMethod != null && ONLINE.includes(selectedMethod);
  const emailRequired = selectedMethod === "PIX" && paymentMode.emailRequiredForPix;
  // O CPF só é exigido para pagar online (Pix e cartão): o Asaas cria a cobrança com ele.
  const hasCpf = Boolean(cpfLast3) || isValidCpf(cpfDevice);
  const cpfOk = !online || hasCpf;

  const canNow = openState.kind === "open";
  const canSchedule = r.acceptsScheduling && openState.kind !== "paused" && r.status === "OPEN";
  const effectiveWhen = canNow ? (canSchedule ? when : "now") : "schedule";
  const slots = useMemo(
    () => (now && canSchedule ? scheduleSlots(r.hours, r.timezone, now, r.avgPrepMinutes, 7) : []),
    [now, canSchedule, r.hours, r.timezone, r.avgPrepMinutes],
  );
  const days = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of slots) if (!seen.has(s.dateKey)) seen.set(s.dateKey, s.dateLabel);
    return [...seen].map(([key, label]) => ({ key, label }));
  }, [slots]);
  const activeDay = days.some((d) => d.key === dateKey) ? dateKey : (days[0]?.key ?? "");
  const daySlots = slots.filter((s) => s.dateKey === activeDay);
  const scheduledFor = effectiveWhen === "schedule" && slots.some((s) => s.iso === slotIso) ? slotIso : null;

  const built = cart.hydrated
    ? buildQuotePayload({
        slug: r.slug,
        items: cart.items,
        type,
        tableNumber: cart.tableNumber,
        couponCode: cart.couponCode,
        phone,
        address: isDelivery ? address : null,
        scheduledFor,
        paymentMethod: selectedMethod,
        acceptsPickup: r.acceptsPickup,
      })
    : null;
  const q = useQuote(built?.payload ?? null);
  const fresh = q.key === q.currentKey && !q.loading;
  const quote = fresh ? q.quote : null;
  const quoteError = fresh ? q.error : null;
  const quoteLoading = q.loading || !fresh;
  const quoteCoupon = fresh ? ((built?.payload.coupon_code as string | undefined) ?? null) : null;
  const deliveryPending = built?.deliveryPending ?? isDelivery;
  const { currentKey: quoteKey, retry: retryQuote, retrying: quoteRetrying } = q;
  const quoteRateLimited = q.error?.code === "RATE_LIMITED";
  useEffect(() => {
    if (!cart.hydrated || !quoteKey || placed) return;
    const refresh = () => {
      if (document.visibilityState !== "hidden" && !quoteLoading && !submitting && !quoteRetrying && !quoteRateLimited) retryQuote();
    };
    const id = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(id); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [cart.hydrated, quoteKey, retryQuote, quoteRetrying, quoteRateLimited, placed, quoteLoading, submitting]);

  const customerComplete = name.trim().length >= 2 && isValidBrPhone(onlyDigits(phone)) && (email.trim() ? EMAIL_RE.test(email.trim()) : !emailRequired) && cpfOk;
  const addressComplete = onlyDigits(address.cep).length === 8 && Boolean(address.street.trim() && address.number.trim() && address.neighborhood.trim() && address.city.trim());
  useEffect(() => {
    if (restoredFor !== scope || !cart.hydrated || placed) return;
    saveCheckoutDraft(buyerId, r.slug, { name, phone, email, address, when, dateKey, slotIso, method: selectedMethod, cardType, changeFor, notes, cutlery, deliveryInstructions });
  }, [restoredFor, scope, cart.hydrated, placed, buyerId, r.slug, name, phone, email, address, when, dateKey, slotIso, selectedMethod, cardType, changeFor, notes, cutlery, deliveryInstructions]);
  useEffect(() => {
    if (!quote?.coupon || restoredFor !== scope) return;
    rememberCoupon(buyerId, r.slug, quote.coupon.code);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh local history after coupon validation
    setRecentCoupons(loadRecentCoupons(buyerId, r.slug));
  }, [quote?.coupon, restoredFor, scope, buyerId, r.slug]);
  function openSections(open: Partial<Editing>) {
    const section = (["customer", "address", "payment"] as const).find((key) => open[key]);
    if (section) setPanel(section);
  }
  function change(section: SectionKey) { setPanel(section); }

  /** "Não é você? Usar outros dados": forget this device's customer and start a blank form. */
  function notMe() {
    clearCustomer();
    clearSavedAddresses(buyerId);
    clearCheckoutDraft(buyerId, r.slug);
    flushSync(() => {
      setName("");
      setPhone("");
      setEmail("");
      setCpfDevice("");
      setAddress(EMPTY_ADDRESS);
      setMethod(null);
      setCardType("CREDIT");
      setChangeFor("");
      setErrors({});
      setSubmitError(null);
      setReturning(false);
    });
    setPanel("customer");
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (name.trim().length < 2) e.name = "Informe seu nome.";
    if (!isValidBrPhone(onlyDigits(phone))) e.phone = "Informe um celular válido com DDD.";
    if (emailRequired && !EMAIL_RE.test(email.trim())) e.email = "Informe seu e-mail para pagar com Pix.";
    else if (email.trim() && !EMAIL_RE.test(email.trim())) e.email = "E-mail inválido.";
    if (isDelivery) {
      if (onlyDigits(address.cep).length !== 8) e.cep = "CEP inválido.";
      if (!address.street.trim()) e.street = "Informe a rua.";
      if (!address.number.trim()) e.number = "Informe o número.";
      if (!address.neighborhood.trim()) e.neighborhood = "Informe o bairro.";
      if (!address.city.trim()) e.city = "Informe a cidade.";
    }
    if (effectiveWhen === "schedule" && !scheduledFor) e.slot = "Escolha um horário.";
    if (!selectedMethod) e.payment = "Escolha a forma de pagamento.";
    if (!cpfOk) e.cpf = "Informe seu CPF para pagar online.";
    if (selectedMethod === "CASH" && changeFor.trim() && quote && parseMoneyToCents(changeFor) < quote.total_cents) {
      e.change = `O troco deve ser para pelo menos ${formatMoney(quote.total_cents)}.`;
    }
    return e;
  }

  function rememberAttempt(value: CheckoutAttempt) {
    attempt.current = value;
    saveCheckoutAttempt(buyerId, r.slug, value);
    setPendingAttempt(value);
  }

  function forgetAttempt() {
    clearCheckoutAttempt(buyerId, r.slug);
    attempt.current = null;
    setPendingAttempt(null);
    setCanResend(false);
  }

  function completeOrder(orderId: string) {
    setConfirmedChecks(4);
    setPlaced(true);
    forgetAttempt();
    clearCheckoutDraft(buyerId, r.slug);
    cart.clear();
    router.replace(`/cardapio/${r.slug}/confirmacao?id=${orderId}`);
  }

  async function consultAttempt() {
    const pending = attempt.current;
    if (!pending?.pending || statusRequest.current || submissionActive.current) return;
    const controller = new AbortController();
    statusRequest.current = controller;
    setCheckingStatus(true);
    setCanResend(false);
    setStatusError(null);
    setSubmitError(null);
    try {
      const res = await lookupQueuedOrder(pending.key, controller.signal);
      const body = await res.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (res.status === 202) {
        rememberAttempt({ ...pending, accepted: true });
        return;
      }
      if (res.ok && isUuid(body?.orderId)) {
        completeOrder(body.orderId);
        return;
      }
      const err: ApiError = body?.error ?? { code: "UNKNOWN", message: "Não foi possível consultar o pedido. Tente novamente." };
      if (res.status === 404 && err.code === "ATTEMPT_NOT_FOUND") {
        setCanResend(!pending.accepted);
        setStatusError({
          code: err.code,
          message: pending.accepted
            ? "A tentativa não foi localizada. Informe a referência ao restaurante antes de fazer outro pedido."
            : "A tentativa ainda não apareceu na fila. Consulte de novo ou reenvie com os dados originais quando a confirmação estiver disponível.",
        });
        return;
      }
      if (rejectedOrder(res.status, err.code)) forgetAttempt();
      setStatusError(err);
    } catch {
      if (!controller.signal.aborted) setStatusError(NETWORK_ERROR);
    } finally {
      if (statusRequest.current === controller) {
        statusRequest.current = null;
        setCheckingStatus(false);
      }
    }
  }

  async function submit() {
    if (!orderingAvailable || restoredFor !== scope || submissionActive.current || statusRequest.current || (attempt.current?.pending && !canResend)) return;
    setSubmitError(null);
    const e = validate();
    // Render the errors (reopening collapsed sections) before focusing the first invalid field.
    flushSync(() => {
      setErrors(e);
      openSections(addressPending ? { address: true } : sectionsWithErrors(e));
    });
    if (Object.keys(e).length) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    if (addressPending || notesTooLong) return;
    if (blocked || quoteLoading || !quote || isBlockingQuoteError(quoteError)) return;
    const addr = isDelivery
      ? Object.fromEntries(
          Object.entries({ ...address, cep: maskCep(address.cep), state: address.state.trim().toUpperCase().slice(0, 2) })
            .map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
            .filter(([, v]) => typeof v === "number" || Boolean(v)),
        )
      : null;
    const payload = {
      restaurant_slug: r.slug,
      type,
      table_number: type === "DINE_IN" ? cart.tableNumber : null,
      customer: { name: name.trim(), phone: onlyDigits(phone), email: email.trim() },
      address: addr,
      scheduled_for: effectiveWhen === "schedule" ? scheduledFor : null,
      coupon_code: cart.couponCode,
      payment_method: selectedMethod,
      ...(selectedMethod === "CARD_ONLINE" ? { card_type: cardType } : {}),
      change_for_cents: selectedMethod === "CASH" && changeFor.trim() ? parseMoneyToCents(changeFor) : null,
      notes: orderNotes || undefined,
      items: toPayloadItems(cart.items),
      website: honeypot,
    };
    submissionActive.current = true;
    setSubmitting(true);
    setStatusError(null);
    setCanResend(false);
    setQueued(false);
    setConfirmedChecks(1);
    try {
      saveCheckoutDraft(buyerId, r.slug, { name, phone, email, address, when, dateKey, slotIso, method: selectedMethod, cardType, changeFor, notes, cutlery, deliveryInstructions });
      const orderAttempt = await checkoutAttempt(buyerId, r.slug, payload, attempt.current);
      rememberAttempt({ ...orderAttempt, pending: true });
      setConfirmedChecks(2);
      // Pagamento online: o CPF deste aparelho segue separado do pedido (conta: o servidor lê do cofre).
      const res = await submitQueuedOrder(orderAttempt, payload, () => {
        rememberAttempt({ ...orderAttempt, pending: true, accepted: true });
        setQueued(true);
      }, ONLINE.includes(selectedMethod as PaymentMethod) && isValidCpf(cpfDevice) ? cpfDevice : undefined);
      const body = await res.json().catch(() => null);
      if (res.status === 401) {
        setSubmitError({code:"ORDERS_UNAVAILABLE",message:"Não foi possível enviar agora. Tente novamente mais tarde."});
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        const err: ApiError = body?.error ?? { code: "UNKNOWN", message: "Não foi possível enviar o pedido. Tente novamente." };
        if (rejectedOrder(res.status, err.code)) forgetAttempt();
        setSubmitError(err);
        const field = ERROR_FIELD[err.code];
        flushSync(() => {
          if (field) {
            setErrors((x) => ({ ...x, [field]: err.message }));
            const section = SECTION_OF[field];
            if (section) openSections({ [section]: true });
          }
          if (err.code === "INVALID_CUSTOMER") setErrors((x) => ({ ...x, name: name.trim().length < 2 ? err.message : undefined }));
          setSubmitting(false);
        });
        if (field) document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
        return;
      }
      if (!isUuid(body?.orderId)) throw new Error("Invalid order response");
      const stored = loadCustomer();
      if (stored?.buyerId === buyerId) {
        saveCustomer({
          ...stored,
          paymentMethod: selectedMethod,
          ...(selectedMethod === "CARD_ONLINE" ? { cardType } : {}),
          changeForCents: payload.change_for_cents,
        });
      }
      completeOrder(body.orderId);
    } catch {
      setSubmitError(NETWORK_ERROR);
      setSubmitting(false);
    } finally {
      submissionActive.current = false;
    }
  }

  const back = `/cardapio/${r.slug}/carrinho`;
  function goBack() {
    if (window.history.length > 1) router.back();
    else router.replace(back);
  }
  const menuLink = menuHref(r.slug, cart.type, cart.tableNumber);
  // `now` is unknown until mount: a closed restaurant that schedules is not "blocked" meanwhile.
  const noTable = needsTable(r, type === "DINE_IN" ? cart.tableNumber : null);
  const blocked =
    noTable ||
    openState.kind === "paused" ||
    (openState.kind === "closed" && !(canSchedule && (now === null || slots.length > 0)));
  // A DELIVERY quote without a complete address is priced as pickup (or not at all for a
  // delivery-only restaurant): never let it be confirmed. The CTA stays clickable to point at the
  // missing address fields.
  const addressPending = isDelivery && deliveryPending;
  const orderNotes = [
    notes.trim(),
    cutlery ? "Incluir talheres" : "",
    isDelivery && deliveryInstructions.trim() ? "Para a entrega: " + deliveryInstructions.trim() : "",
  ].filter(Boolean).join(" · ");
  const notesTooLong = orderNotes.length > 280;
  const ctaDisabled = !orderingAvailable || restoredFor !== scope || checkingStatus || Boolean(pendingAttempt && !canResend) || notesTooLong || blocked || now === null || (!addressPending && (isBlockingQuoteError(quoteError) || !quote || quoteLoading));
  const estimateOnly = addressPending && !built;
  const total = quote?.total_cents ?? null;
  const ctaLabel = addressPending
    ? "Informe o endereço"
    : total != null
      ? online ? selectedMethod === "PIX" ? "Pagar com Pix" : `Pagar ${formatMoney(total)}` : `Confirmar pedido · ${formatMoney(total)}`
      : "Confirmar pedido";
  const quoteFresh = fresh && !q.loading && Boolean(quote);
  const attemptReference = pendingAttempt?.key.slice(-12).toUpperCase();

  if (submitting || placed) {
    return (
      <div className={styles.page}>
        <CheckoutHeader />
        <main className={styles.progress} aria-live="polite">
          <p className={styles.kicker}>Seu pedido</p>
          <h1 className={styles.heading}>Enviando seu pedido</h1>
          <ul className={styles.progressRows}>
            <li className={confirmedChecks >= 1 ? styles.confirmed : undefined}><span>Restaurante</span><strong>{r.name}{confirmedChecks >= 1 && " ✓"}</strong></li>
            {isDelivery && addressComplete && <li className={confirmedChecks >= 2 ? styles.confirmed : undefined}><span>Entrega</span><strong>{address.street}, {address.number} · {address.neighborhood}{confirmedChecks >= 2 && " ✓"}</strong></li>}
            {selectedMethod && <li className={confirmedChecks >= 4 ? styles.confirmed : undefined}><span>Pagamento selecionado</span><strong>{paymentLabel(selectedMethod, type, paymentMode.provider, cardType).title}{confirmedChecks >= 4 && " ✓"}</strong></li>}
            {total != null && <li className={confirmedChecks >= 4 ? styles.confirmed : undefined}><span>Total do pedido</span><strong>{formatMoney(total)}{confirmedChecks >= 4 && " ✓"}</strong></li>}
          </ul>
          <p role="status" className={styles.progressStatus}>
            {/* eslint-disable-next-line @next/next/no-img-element -- animated loading asset */}
            {!placed && <img src="/checkout-loading.gif" width={24} height={24} alt="" />}
            {placed ? "Abrindo a próxima etapa…" : queued ? "Pedido na fila. Aguardando a confirmação…" : "Conferindo os itens e enviando seu pedido…"}
          </p>
          {attemptReference && <p className="mt-3 text-body-sm">Referência para atendimento <strong className="font-mono">{attemptReference}</strong></p>}
        </main>
      </div>
    );
  }

  const showFinalTotal = total != null && !deliveryPending;
  const itemCount = cart.items.reduce((count, line) => count + line.quantity, 0);
  const checkoutAction = (
    <div className={styles.paymentAction}>
      <div className="min-w-0">
        <p className={cn("text-caption text-ink-muted", !showFinalTotal && styles.pendingLabel)}>{showFinalTotal ? "Total do pedido" : "Valor a confirmar"}</p>
        <p aria-live="polite" className={cn(showFinalTotal ? styles.paymentTotal : styles.pendingTotal, "tabular-nums text-ink")}>{showFinalTotal ? formatMoney(total) : "A calcular"}</p>
        {quoteFresh && !deliveryPending && quote && quote.discount_cents > 0 && <p className="text-caption font-bold text-success">Você economizou {formatMoney(quote.discount_cents)}</p>}
        <SubmitError error={pendingAttempt ? null : submitError} />
      </div>
      <Button size="md" className={cn(styles.paymentButton, addressPending && styles.addressButton, "text-center shadow-none")} disabled={ctaDisabled} loading={submitting} onClick={() => void submit()}>
        <span>{canResend && !addressPending ? "Reenviar tentativa" : ctaLabel}</span>
      </Button>
    </div>
  );

  return (
    <div className={cn(styles.page, "flex w-full flex-col")}>
      <CheckoutHeader onBack={goBack} />
      {!orderingAvailable && <p role="status" className="mx-auto w-full max-w-lg rounded-xl border border-line bg-surface-muted p-4 text-body-sm">O envio de novos pedidos está temporariamente indisponível.</p>}
      <main className={cn(styles.shell, "flex-1")}>
        <div className={styles.intro}>
          <p className={styles.kicker}>Seu pedido</p>
          <h1 className={styles.heading}>Finalizar pedido</h1>
        </div>

        {attemptReference ? (
          <div className="mt-4">
            <Section title="Acompanhe seu pedido">
              <p role="status" className="text-body-sm text-ink-muted">
                {checkingStatus ? "Consultando pedido…" : "Aguardando a confirmação do pedido."}
              </p>
              <p className="text-body-sm">Referência para atendimento <strong className="font-mono">{attemptReference}</strong></p>
              <SubmitError error={statusError ?? submitError} />
              <Button type="button" variant="outline" className="self-start" disabled={checkingStatus} onClick={() => void consultAttempt()}>Consultar pedido</Button>
            </Section>
          </div>
        ) : (
          <SubmitError error={statusError} />
        )}

        {!cart.hydrated ? (
          <CheckoutSkeleton />
        ) : cart.items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Seu carrinho está vazio"
            description="Adicione itens antes de finalizar."
            action={
              <Button asChild variant="outline">
                <Link href={menuLink}>Ver cardápio</Link>
              </Button>
            }
          />
        ) : (
          <div className={styles.grid}>
            <form
              id="checkout-details"
              className="flex min-w-0 flex-col gap-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {/* Honeypot: hidden from people, filled only by bots. */}
              <div aria-hidden="true" className="sr-only">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </div>

              {blocked && (
                <p role="status" className="rounded-xl bg-danger-soft px-3.5 py-3 text-body-sm text-danger">
                  {noTable
                    ? NEEDS_TABLE_REASON
                    : openState.kind === "paused"
                      ? "O restaurante pausou os pedidos temporariamente."
                      : "O restaurante está fechado no momento."}
                </p>
              )}

              <Section title="Seus dados">
                <SummaryCard icon={UserRound} title={customerComplete ? name.trim() : "Como podemos falar com você?"} subtitle={customerComplete ? <>{maskPhone(phone)}{email.trim() && <><br />{email.trim()}</>}</> : "Informe nome e celular para acompanhar o pedido."} changeLabel="Alterar seus dados" onChange={() => change("customer")} />
                {returning && <p className="text-caption text-ink-muted">Não é você? <button type="button" onClick={notMe} className={cn("min-h-9 font-bold text-brand", interactive)}>Usar outros dados</button></p>}
              </Section>
              <Section title="Como você quer receber?">
                {type === "DINE_IN" ? (
                  <OptionCard selected control="none" disabled={false}>
                    <span className="block font-bold">{cart.tableNumber ? `Mesa ${cart.tableNumber}` : "Pedido na mesa"}</span>
                    <span className="block text-caption font-normal text-ink-muted">Pedido no salão · {r.avgPrepMinutes} min</span>
                  </OptionCard>
                ) : (
                  <SegmentedControl
                    aria-label="Tipo de pedido"
                    className={styles.fulfillmentChoice}
                    block
                    value={type}
                    onChange={(value) => cart.setType(value as OrderType)}
                    options={[
                      ...(r.acceptsDelivery ? [{ value: "DELIVERY", label: "Entrega" }] : []),
                      ...(r.acceptsPickup ? [{ value: "PICKUP", label: "Retirada no local" }] : []),
                    ]}
                  />
                )}
              {isDelivery && <div className="mt-2 space-y-2">
                <SummaryCard icon={MapPin} title={addressComplete ? [address.street.trim() + ", " + address.number.trim(), address.complement.trim()].filter(Boolean).join(" · ") : "Onde vamos entregar?"} subtitle={addressComplete ? <>{address.neighborhood.trim()} · {address.city.trim()}{address.state.trim() ? "/" + address.state.trim().toUpperCase() : ""}{customerComplete && <><br />{name.trim()} · {maskPhone(phone)}</>}</> : "Adicione ou selecione um endereço neste dispositivo."} changeLabel="Alterar endereço de entrega" onChange={() => change("address")} />
                {isAddressQuoteError(quoteError) && <p role="alert" className="text-body-sm text-danger">{quoteError?.message}</p>}
                {locationSuggestion && <div role="status" className="flex flex-col gap-2 rounded-2xl border border-brand-soft-border bg-brand-soft p-3">
                  <p className="text-body-sm"><strong>Você está em {[locationSuggestion.address.street, locationSuggestion.address.number].filter(Boolean).join(", ")}</strong>
                    <span className="block text-caption text-ink-muted">{[locationSuggestion.address.neighborhood, locationSuggestion.address.city].filter(Boolean).join(" · ")}</span></p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => applyLocation(locationSuggestion.address, locationSuggestion.located)}>Usar este endereço</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setLocationSuggestion(null)}>Manter o atual</Button>
                  </div>
                </div>}
                <div className="flex flex-wrap items-center gap-2">
                  {!addressComplete && <Button type="button" variant="outline" size="sm" loading={locationStatus.busy} disabled={locationStatus.busy} onClick={() => { void fillFromDeviceLocation(true); }}>
                    <Icon icon={MapPin} size={16} />Usar minha localização
                  </Button>}
                  {locationStatus.message && <p role="status" className="text-caption text-ink-muted">{locationStatus.message}</p>}
                </div>
              </div>}
              {type === "PICKUP" && r.addressLine && <p className="mt-2 text-body-sm text-ink-secondary"><strong>Retirada no restaurante</strong><br />{r.addressLine}</p>}
              <div role="status" className="mt-2 text-body-sm text-ink">
                <div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand"><Icon icon={Clock} size={20} /></span><div>
                <p className="flex items-center gap-2 font-bold">{type === "DELIVERY" ? "Previsão de entrega" : type === "PICKUP" ? "Previsão de retirada" : "Previsão de preparo"}</p>
                <p className="mt-1">{scheduledFor ? "Agendado para " + new Intl.DateTimeFormat("pt-BR", { timeZone: r.timezone, dateStyle: "short", timeStyle: "short" }).format(new Date(scheduledFor)) : quote && !deliveryPending ? quote.estimated_minutes + " min" : type === "DELIVERY" ? deliveryRange(r.deliveryMinutes, r.avgPrepMinutes) : r.avgPrepMinutes + " min"}</p>
                </div></div>
                {isDelivery && <div className="mt-2 rounded-2xl bg-[#fff9d8] px-3.5 py-3.5"><p className="font-extrabold">Informações da entrega</p><p className="text-caption text-ink-secondary">{deliveryPending ? "A previsão e a taxa serão confirmadas com o endereço." : "O restaurante organiza a entrega com sua própria equipe."}</p></div>}
              </div>

              {(canSchedule || !canNow) && (
                <div className="space-y-3">
                  <SegmentedControl
                    aria-label="Quando"
                    block
                    options={canNow ? [{ value: "now", label: "Agora" }, { value: "schedule", label: "Agendar" }] : [{ value: "schedule", label: "Agendar" }]}
                    value={effectiveWhen}
                    onChange={(v) => setWhen(v as "now" | "schedule")}
                    className="sm:max-w-sm"
                  />
                  {effectiveWhen === "schedule" &&
                    (slots.length === 0 ? (
                      <p className="text-body-sm text-ink-muted">Não há horários disponíveis para agendamento nos próximos dias.</p>
                    ) : (
                      <div className="grid gap-3.5 sm:grid-cols-2">
                        <FormField label="Dia" htmlFor="slot-day">
                          <Select value={activeDay} onValueChange={(v) => { setDateKey(v); setSlotIso(""); }}>
                            <SelectTrigger id="slot-day" size="lg">
                              <SelectValue placeholder="Escolha o dia" />
                            </SelectTrigger>
                            <SelectContent>
                              {days.map((d) => (
                                <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Horário" htmlFor="slot-time" required error={errors.slot}>
                          <Select value={scheduledFor ?? ""} onValueChange={(v) => { setSlotIso(v); setErrors((x) => ({ ...x, slot: undefined })); }}>
                            <SelectTrigger id="slot-time" size="lg">
                              <SelectValue placeholder="Escolha o horário" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {daySlots.map((s) => (
                                <SelectItem key={s.iso} value={s.iso}>{s.timeLabel}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>
                    ))}
                </div>
              )}
              </Section>

              <Section title="Pagamento">
                {selectedMethod ? <SummaryCard icon={METHOD_ICON[selectedMethod]} title={paymentLabel(selectedMethod, type, paymentMode.provider, cardType).title} subtitle={selectedMethod === "CASH" ? changeFor.trim() ? "Troco para " + formatMoney(parseMoneyToCents(changeFor)) : "Sem troco" : paymentLabel(selectedMethod, type, paymentMode.provider, cardType).hint} changeLabel="Alterar forma de pagamento" onChange={() => change("payment")} /> : <p className="text-body-sm text-danger">Nenhuma forma de pagamento disponível.</p>}
                {errors.payment && <p role="alert" className="text-caption text-danger">{errors.payment}</p>}                {online && paymentMode.provider === "development" && <p role="note" className="flex items-center gap-2 text-caption text-ink-muted"><FlaskConical size={18} />Pagamento de demonstração — nenhuma cobrança real.</p>}
              </Section>


              <Section title="Economize no pedido">
                <CouponBox
                  render={(content, { applied, error }) => <>
                    <button type="button" onClick={() => setPanel("coupon")} className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-success-soft px-3.5 py-3 text-left focus-visible:outline-2 focus-visible:outline-accent">
                      <Icon icon={TicketPercent} size={22} className="shrink-0 text-success" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold text-success">{applied && quote ? formatMoney(quote.discount_cents) + " OFF" : "Adicionar cupom"}</span>
                        <span className="block text-caption text-ink-muted">{applied ? "Cupom aplicado" : cart.couponCode && quoteLoading ? "Validando cupom…" : "Adicionar ou gerenciar cupom"}</span>
                      </span>
                      <Icon icon={ChevronLeft} size={18} className="rotate-180" />
                    </button>
                    {error && panel !== "coupon" && <p role="alert" className="text-caption text-danger">{error}</p>}
                    <ResponsiveSheet open={panel === "coupon"} onOpenChange={(open) => { if (!open) setPanel(null); }} className={styles.checkoutDialog} title="Cupons e descontos" description="Insira um código e confira o desconto antes de finalizar." size="md">
                      <div className="space-y-4">
                        {content}
                        {publicCoupons.length > 0 && <div className="space-y-2">
                          <p className="text-body-sm font-bold text-ink">Cupons disponíveis</p>
                          <ul className="space-y-2">
                            {publicCoupons.map((coupon) => {
                              const block = publicCouponBlock(coupon, cartEstimate(cart.items));
                              const isApplied = cart.couponCode === coupon.code;
                              const rules = [coupon.per_customer_limit != null ? `${coupon.per_customer_limit} por cliente` : null,
                                coupon.type === "PERCENT" && coupon.max_discount_cents != null ? `máx. ${formatMoneyCompact(coupon.max_discount_cents)}` : null,
                                coupon.ends_at ? `até ${new Date(coupon.ends_at).toLocaleDateString("pt-BR", { timeZone: r.timezone })}` : null].filter(Boolean).join(" · ");
                              return <li key={coupon.code} className={"flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 " + (block ? "opacity-60" : "bg-surface")}>
                                <Icon icon={TicketPercent} size={22} className="shrink-0 text-success" />
                                <span className="min-w-0 flex-1">
                                  <span className="block font-extrabold text-ink">{couponHeadline(coupon)} <span className="font-mono text-caption font-semibold text-ink-muted">{coupon.code}</span></span>
                                  {coupon.description && <span className="block text-caption text-ink-muted">{coupon.description}</span>}
                                  {rules && <span className="block text-caption text-ink-muted">{rules}</span>}
                                  {block && <span className="block text-caption font-semibold text-danger">{block}</span>}
                                </span>
                                <Button type="button" variant="outline" disabled={Boolean(block) || isApplied} onClick={() => cart.setCoupon(coupon.code)}>{isApplied ? "Aplicado" : "Aplicar"}</Button>
                              </li>;
                            })}
                          </ul>
                        </div>}
                        {recentCoupons.filter((code) => code !== cart.couponCode).length > 0 && <div className="space-y-2">
                          <p className="text-caption text-ink-muted">Cupons usados neste dispositivo. Sujeitos às regras da loja.</p>
                          <div className="flex flex-wrap gap-2">{recentCoupons.filter((code) => code !== cart.couponCode).map((code) => <Button type="button" variant="outline" key={code} onClick={() => cart.setCoupon(code)}>{code}</Button>)}</div>
                        </div>}
                        {applied && <Button block onClick={() => setPanel(null)}>Voltar ao checkout</Button>}
                      </div>
                    </ResponsiveSheet>
                  </>}
                  couponCode={cart.couponCode}
                  setCoupon={cart.setCoupon}
                  quote={quote}
                  quoteCoupon={quoteCoupon}
                  loading={quoteLoading}
                  quoteError={quoteError?.code === "ADDRESS_REQUIRED" ? null : quoteError}
                  pendingText={estimateOnly ? "Será validado quando o endereço estiver completo." : undefined}
                />
              </Section>

              <Section title="Informações adicionais">
                <label className="flex min-h-11 items-center justify-between gap-3">
                  Incluir talheres
                  <input className="size-5 shrink-0 accent-current" type="checkbox" checked={cutlery} onChange={(event) => setCutlery(event.target.checked)} />
                </label>
                <FormField label="Observações para o restaurante" htmlFor="order-notes">
                  <Textarea className="min-h-[52px]" id="order-notes" aria-label="Observações do pedido" value={notes} maxLength={280} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: embalar os molhos separadamente" />
                </FormField>
                {isDelivery && <FormField label="Instruções para entrega" htmlFor="delivery-instructions">
                  <Textarea id="delivery-instructions" className="min-h-[52px]" value={deliveryInstructions} maxLength={280} onChange={(event) => setDeliveryInstructions(event.target.value)} placeholder="Ex.: chamar na portaria" />
                </FormField>}
                <p className={notesTooLong ? "text-caption text-danger" : "text-caption text-ink-muted"} role={notesTooLong ? "alert" : undefined}>
                  {notesTooLong ? "Reduza as observações e instruções para continuar. " : "Informações opcionais. "}{orderNotes.length}/280 caracteres.
                </p>
              </Section>
              <p className="px-1 text-caption text-ink-muted">
                Ao confirmar, você concorda com os <a className="font-bold underline" href="/termos" target="_blank" rel="noopener">termos de uso</a> e
                a <a className="font-bold underline" href="/privacidade" target="_blank" rel="noopener">política de privacidade</a>.
              </p>
            </form>

            <aside className={styles.summary} aria-label="Resumo do pedido">
              <Card padding="md" radius="4xl" className={cn(styles.panel, "flex flex-col gap-3 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto")}>
                <h2 className={cn(styles.panelTitle, "text-ink")}>Resumo do pedido</h2>
                <details open={desktop || undefined} className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-accent">
                    <span className="flex min-w-0 items-center gap-3">{r.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- restaurant logo
                      <img src={r.logoUrl} alt="" className="size-10 shrink-0 rounded-xl object-cover" />
                    ) : <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand"><Icon icon={ShoppingBag} size={22} /></span>}<span className="min-w-0"><span className="block font-bold">{r.name}</span><span className="text-caption text-ink-muted">{itemCount} {itemCount === 1 ? "item" : "itens"}</span></span></span>
                    <span aria-hidden="true" className="group-open:rotate-180">⌄</span>
                  </summary>
                <ul className="mt-3 flex flex-col gap-3">
                  {cart.items.map((line, i) => (
                    <li key={line.lineId} className="flex justify-between gap-3 text-body-sm font-normal text-ink-muted">
                      {line.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- restaurant product thumbnail
                        <img src={line.imageUrl} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" />
                      )}
                      <span className="min-w-0 flex-1 break-words">
                        <strong className="block text-body text-ink">{line.quantity} × {line.name}</strong>
                        {addonSummary(line) && <span className="block text-caption">{addonSummary(line)}</span>}
                        {line.notes && <span className="block text-caption">{line.notes}</span>}
                      </span>
                      <span className="shrink-0 font-semibold text-ink-secondary tabular-nums">
                        {formatMoney((quoteFresh ? quote?.items[i]?.total_cents : null) ?? line.unitPriceCents * line.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                </details>
                <h2 className={cn(styles.panelTitle, "border-t border-dashed border-line pt-4 text-ink")}>Detalhes do preço</h2>
                <QuoteBreakdown
                  className="pt-1"
                  quote={quote}
                  error={quoteError?.code === "ADDRESS_REQUIRED" ? null : quoteError}
                  loading={quoteLoading}
                  deliveryPending={deliveryPending}
                  pendingLabel="Informe o endereço"
                  isDelivery={isDelivery}
                  missingCents={belowMinimumMissingCents(quoteError, cartEstimate(cart.items))}
                  onRetry={q.retry}
                  retrying={q.retrying}
                  estimate={{ subtotalCents: cartEstimate(cart.items), minOrderCents: r.minOrderCents }}
                  couponPending={Boolean(cart.couponCode)}
                  totalSize="lg"
                  hideConfirmedTotal={showFinalTotal}
                />
                {isDelivery && deliveryPending && (
                  <p className="text-caption text-ink-faint">Preencha o endereço para calcular a taxa de entrega.</p>
                )}

                {desktop && <div className={styles.summaryAction}>{checkoutAction}</div>}
              </Card>
            </aside>
          </div>
        )}
      </main>

      {panel === "customer" && <CustomerPanel initialErrors={{ name: errors.name, phone: errors.phone, email: errors.email, cpf: errors.cpf }} open onOpenChange={(open) => { if (!open) setPanel(null); }} serverError={errors.name ?? errors.phone ?? errors.email} value={{ name, phone, email, cpf: formatCpf(cpfDevice) }} emailRequired={emailRequired} cpfRequired={online} cpf={{ deviceValue: cpfDevice, savedLast3: cpfLast3, signedIn: cpf?.signedIn ?? false }} onConfirm={({ cpf: cpfInput, ...value }) => {
        const signedIn = cpf?.signedIn ?? false;
        // Conta: CPF cifrado no servidor. Sem conta: só neste aparelho (nunca por IP, que não identifica ninguém).
        const deviceCpf = signedIn ? "" : cpfInput || cpfDevice;
        const stored = loadCustomer();
        saveCustomer({ ...(stored?.buyerId === buyerId ? stored : { address: null }), ...value, cpf: deviceCpf, buyerId });
        if (signedIn && cpfInput) {
          const form = new FormData();
          form.set("cpf", cpfInput);
          void saveBuyerCpfAction(form).then((result) => {
            if (result.ok) setCpfLast3(result.last3);
            else notify.error(result.error);
          });
        } else setCpfDevice(deviceCpf);
        setReturning(true);
        setSubmitError(null);
        setName(value.name);
        setPhone(maskPhone(value.phone));
        setEmail(value.email);
        notify.success("Dados atualizados");
        setErrors((current) => ({ ...current, name: undefined, phone: undefined, email: undefined, cpf: undefined }));
        setPanel(null);
      }} />}
      {panel === "address" && <AddressPanel initialErrors={{ cep: errors.cep, street: errors.street, number: errors.number, neighborhood: errors.neighborhood, city: errors.city }} buyerId={buyerId} open devicePoint={addressFromGps} onOpenChange={(open) => { if (!open) setPanel(null); }} value={address} serverError={isAddressQuoteError(quoteError) ? quoteError?.message : undefined} onConfirm={(value) => { setSubmitError(null); setAddress({ ...EMPTY_ADDRESS, ...value }); notify.success("Endereço selecionado"); setErrors((current) => ({ ...current, cep: undefined, street: undefined, number: undefined, neighborhood: undefined, city: undefined })); setPanel(null); }} />}
      {panel === "payment" && <PaymentPanel open onOpenChange={(open) => { if (!open) setPanel(null); }} methods={r.paymentMethods} onlineAvailable={paymentMode.onlineAvailable} cardType={cardType} value={selectedMethod} changeFor={changeFor} type={type} provider={paymentMode.provider} totalCents={total} error={errors.change ?? errors.payment} onConfirm={(value, change, kind) => { setSubmitError(null); setMethod(value); if (kind) setCardType(kind); setChangeFor(change); notify.success("Forma de pagamento atualizada"); setErrors((current) => ({ ...current, payment: undefined, change: undefined, email: undefined })); setPanel(null); }} />}
      {!desktop && cart.hydrated && cart.items.length > 0 && (
        <div className={styles.mobileAction}>
          {checkoutAction}
        </div>
      )}
    </div>
  );
}

function CheckoutHeader({ onBack }: { onBack?: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className={cn(styles.header, "mx-auto w-full max-w-[1240px] items-center gap-3 px-4 sm:px-6")}>
        <div>{onBack && <IconButton label="Voltar" icon={ChevronLeft} size={40} variant="outline" onClick={onBack} />}</div>
        <Link href="/" aria-label="Início do Menzu"><Logo size="sm" /></Link>
      </div>
    </header>
  );
}

function CheckoutSkeleton() {
  return (
    <div role="status" className={styles.grid}>
      <span className="sr-only">Carregando checkout…</span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        {[0, 1, 2, 3].map((card) => <div key={card} className={styles.skeleton}><div /><div /></div>)}
      </div>
      <div aria-hidden="true" className={styles.skeleton}><div /><div /><div /></div>
    </div>
  );
}

function SubmitError({ error }: { error: ApiError | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="flex items-start gap-2 text-body-sm text-danger">
      <Icon icon={CircleAlert} size={18} className="mt-px" />
      {error.message}
    </p>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={cn(styles.panel, "flex flex-col gap-3 border border-line bg-surface")}>
      <h2 className={cn(styles.panelTitle, "text-ink")}>{title}</h2>
      {children}
    </section>
  );
}


