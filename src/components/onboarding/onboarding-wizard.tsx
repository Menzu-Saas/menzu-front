"use client";

import { ArrowLeft, ArrowRight, Bike, Copy, MapPin, Phone, ShoppingBag, Store, UtensilsCrossed } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { FormAlert } from "@/components/auth/form-alert";
import { Button, FormField, Icon, Input, OptionCard, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import { parseMoneyToCents } from "@/lib/money";
import { onlyDigits } from "@/lib/phone";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import {
  restaurantBasicsSchema,
  restaurantHoursSchema,
  restaurantOperationSchema,
  WEEKDAYS,
  type OnboardingInput,
} from "@/lib/schemas/restaurant";
import { slugify } from "@/lib/slug";
import { createRestaurantAction } from "@/server/actions/onboarding";
import { StepIndicator } from "./step-indicator";

const STEPS = [{ label: "Restaurante" }, { label: "Operação" }, { label: "Horários" }];
const BASICS_FIELDS = new Set(["name", "slug", "phone", "whatsapp"]);
const HOURS_PREFIX = "hours";
/** Form keys whose validation error lives under a different (payload) key. */
const ERROR_KEY: Partial<Record<keyof FormState, string>> = {
  min_order: "min_order_cents",
  avg_prep: "avg_prep_minutes",
  delivery_fee: "default_delivery_fee_cents",
  accepts_pickup: "accepts_delivery",
  accepts_dine_in: "accepts_delivery",
};

interface DayHours {
  weekday: number;
  open: boolean;
  opens_at: string;
  closes_at: string;
}

interface FormState {
  name: string;
  slug: string;
  phone: string;
  whatsapp: string;
  address_cep: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  accepts_dine_in: boolean;
  min_order: string;
  avg_prep: string;
  delivery_fee: string;
  hours: DayHours[];
}

const INITIAL: FormState = {
  name: "",
  slug: "",
  phone: "",
  whatsapp: "",
  address_cep: "",
  address_street: "",
  address_number: "",
  address_complement: "",
  address_neighborhood: "",
  address_city: "",
  address_state: "",
  accepts_delivery: true,
  accepts_pickup: true,
  accepts_dine_in: false,
  min_order: "",
  avg_prep: "30",
  delivery_fee: "",
  // Listed Monday → Sunday, as people in Brazil read a week.
  hours: [...WEEKDAYS.slice(1), WEEKDAYS[0]].map((d) => ({ weekday: d.value, open: true, opens_at: "11:00", closes_at: "23:00" })),
};

/** Progressive BR phone mask: (11) 98765-4321 / (11) 3456-7890. */
function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function centsToInput(cents: number): string {
  return cents ? (cents / 100).toFixed(2).replace(".", ",") : "";
}

/** Menu origin shown in the slug preview, e.g. "menzu.app" or "localhost:3000". */
const MENU_HOST = ("").replace(/^https?:\/\//, "").replace(/\/+$/, "");

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastCep = useRef("");

  function clearErrors(...keys: string[]) {
    setErrors((e) => {
      if (!keys.some((k) => k in e)) return e;
      const next = { ...e };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    clearErrors(ERROR_KEY[key] ?? key);
  }

  function setDay(weekday: number, patch: Partial<DayHours>) {
    setForm((f) => ({ ...f, hours: f.hours.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)) }));
    clearErrors(`${HOURS_PREFIX}.w${weekday}`, HOURS_PREFIX);
  }

  function goTo(next: number) {
    setStep(next);
    setErrors({});
    setFormError(undefined);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  const openDays = form.hours.filter((h) => h.open);

  function payload(): OnboardingInput {
    return {
      name: form.name,
      slug: form.slug,
      phone: form.phone,
      whatsapp: form.whatsapp,
      address_cep: form.address_cep,
      address_street: form.address_street,
      address_number: form.address_number,
      address_complement: form.address_complement,
      address_neighborhood: form.address_neighborhood,
      address_city: form.address_city,
      address_state: form.address_state,
      accepts_delivery: form.accepts_delivery,
      accepts_pickup: form.accepts_pickup,
      accepts_dine_in: form.accepts_dine_in,
      min_order_cents: parseMoneyToCents(form.min_order),
      avg_prep_minutes: form.avg_prep.trim() === "" ? Number.NaN : Number(form.avg_prep),
      default_delivery_fee_cents: form.accepts_delivery ? parseMoneyToCents(form.delivery_fee) : 0,
      hours: openDays.map(({ weekday, opens_at, closes_at }) => ({ weekday, opens_at, closes_at })),
    };
  }

  /** Re-keys "hours.<index>.<field>" errors to "hours.w<weekday>" so each day row can show its own error. */
  function withDayErrors(errs: FieldErrors): FieldErrors {
    const out: FieldErrors = {};
    for (const [key, message] of Object.entries(errs)) {
      const m = key.match(/^hours\.(\d+)\./);
      if (m) {
        const day = openDays[Number(m[1])];
        if (day) out[`${HOURS_PREFIX}.w${day.weekday}`] ??= message;
      } else out[key] = message;
    }
    return out;
  }

  function validateStep(index: number): boolean {
    const data = payload();
    const schema = [restaurantBasicsSchema, restaurantOperationSchema, restaurantHoursSchema][index];
    const result = schema.safeParse(data);
    if (result.success) return true;
    setErrors(withDayErrors(fieldErrors(result.error)));
    return false;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateStep(step)) return;
    if (step < STEPS.length - 1) {
      goTo(step + 1);
      return;
    }
    setFormError(undefined);
    startTransition(async () => {
      const result = await createRestaurantAction(payload());
      if (!result || result.ok) return;
      const errs = withDayErrors(result.fieldErrors ?? {});
      const keys = Object.keys(errs);
      if (keys.some((k) => BASICS_FIELDS.has(k))) setStep(0);
      else if (keys.some((k) => !k.startsWith(HOURS_PREFIX))) setStep(1);
      setErrors(errs);
      setFormError(result.error);
    });
  }

  async function lookupCep(masked: string) {
    const cep = onlyDigits(masked);
    if (cep.length !== 8 || cep === lastCep.current) return;
    lastCep.current = cep;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) return;
      setForm((f) => ({
        ...f,
        address_street: f.address_street || data.logradouro || "",
        address_neighborhood: f.address_neighborhood || data.bairro || "",
        address_city: f.address_city || data.localidade || "",
        address_state: f.address_state || data.uf || "",
      }));
    } catch {
      // Optional convenience: the address can always be typed by hand.
    }
  }

  function copyFirstOpenDay() {
    const source = openDays[0];
    if (!source) return;
    setForm((f) => ({
      ...f,
      hours: f.hours.map((h) => (h.open ? { ...h, opens_at: source.opens_at, closes_at: source.closes_at } : h)),
    }));
  }

  const titles = [
    { title: "Conte sobre o seu restaurante", description: "Esses dados aparecem no seu cardápio digital." },
    { title: "Endereço e operação", description: "Como você atende e quanto cobra pela entrega." },
    { title: "Horários de funcionamento", description: "Fora desses horários o cardápio não aceita pedidos." },
  ][step];

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <StepIndicator steps={STEPS} current={step} />

      <header className="flex flex-col gap-1.5">
        <h1 ref={headingRef} tabIndex={-1} className="text-title-xl text-ink outline-none">
          {titles.title}
        </h1>
        <p className="text-body-sm font-normal text-ink-muted">{titles.description}</p>
      </header>

      {formError && <FormAlert>{formError}</FormAlert>}

      {step === 0 && (
        <div className="flex flex-col gap-4.5">
          <FormField label="Nome do restaurante" htmlFor="name" error={errors.name} required>
            <Input
              size="lg"
              name="name"
              autoComplete="organization"
              placeholder="Ex.: Burger da Vila"
              leftIcon={Store}
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
                clearErrors("name", ...(slugTouched ? [] : ["slug"]));
              }}
            />
          </FormField>
          <FormField
            label="Endereço do cardápio"
            htmlFor="slug"
            error={errors.slug}
            required
            hint={
              <>
                Seu cardápio:{" "}
                <span className="break-all font-mono text-ink-secondary">
                  {MENU_HOST ? `${MENU_HOST}/cardapio/${form.slug || "seu-restaurante"}` : "Identificador da loja: " + (form.slug || "seu-restaurante")}
                </span>
              </>
            }
          >
            <Input
              size="lg"
              name="slug"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="burger-da-vila"
              className="font-mono"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50));
              }}
            />
          </FormField>
          <div className="grid gap-4.5 sm:grid-cols-2">
            <FormField label="Telefone" htmlFor="phone" error={errors.phone} required>
              <Input
                size="lg"
                type="tel"
                name="phone"
                autoComplete="tel-national"
                inputMode="tel"
                placeholder="(11) 98765-4321"
                leftIcon={Phone}
                value={form.phone}
                onChange={(e) => set("phone", maskPhone(e.target.value))}
              />
            </FormField>
            <FormField label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp} hint="Opcional. Recebe as mensagens dos clientes.">
              <Input
                size="lg"
                type="tel"
                name="whatsapp"
                inputMode="tel"
                placeholder="(11) 98765-4321"
                leftIcon={Phone}
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", maskPhone(e.target.value))}
              />
            </FormField>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-4.5">
            <legend className="eyebrow mb-3.5 text-ink-subtle">Endereço</legend>
            <div className="grid gap-4.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <FormField label="CEP" htmlFor="address_cep" error={errors.address_cep}>
                <Input
                  size="lg"
                  name="address_cep"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  leftIcon={MapPin}
                  value={form.address_cep}
                  onChange={(e) => {
                    const v = maskCep(e.target.value);
                    set("address_cep", v);
                    void lookupCep(v);
                  }}
                />
              </FormField>
              <FormField label="Rua" htmlFor="address_street" error={errors.address_street}>
                <Input
                  size="lg"
                  name="address_street"
                  autoComplete="address-line1"
                  placeholder="Av. Paulista"
                  value={form.address_street}
                  onChange={(e) => set("address_street", e.target.value)}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4.5">
              <FormField label="Número" htmlFor="address_number" error={errors.address_number}>
                <Input
                  size="lg"
                  name="address_number"
                  placeholder="1000"
                  value={form.address_number}
                  onChange={(e) => set("address_number", e.target.value)}
                />
              </FormField>
              <FormField label="Complemento" htmlFor="address_complement" error={errors.address_complement}>
                <Input
                  size="lg"
                  name="address_complement"
                  autoComplete="address-line2"
                  placeholder="Loja 2"
                  value={form.address_complement}
                  onChange={(e) => set("address_complement", e.target.value)}
                />
              </FormField>
            </div>
            <div className="grid gap-4.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)]">
              <FormField label="Bairro" htmlFor="address_neighborhood" error={errors.address_neighborhood}>
                <Input
                  size="lg"
                  name="address_neighborhood"
                  placeholder="Bela Vista"
                  value={form.address_neighborhood}
                  onChange={(e) => set("address_neighborhood", e.target.value)}
                />
              </FormField>
              <FormField label="Cidade" htmlFor="address_city" error={errors.address_city}>
                <Input
                  size="lg"
                  name="address_city"
                  autoComplete="address-level2"
                  placeholder="São Paulo"
                  value={form.address_city}
                  onChange={(e) => set("address_city", e.target.value)}
                />
              </FormField>
              <FormField label="UF" htmlFor="address_state" error={errors.address_state}>
                <Input
                  size="lg"
                  name="address_state"
                  autoComplete="address-level1"
                  placeholder="SP"
                  maxLength={2}
                  value={form.address_state}
                  onChange={(e) => set("address_state", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                />
              </FormField>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="eyebrow mb-3.5 text-ink-subtle">Tipos de pedido</legend>
            <OptionCard
              selected={form.accepts_delivery}
              onSelect={() => set("accepts_delivery", !form.accepts_delivery)}
              trailing={<Icon icon={Bike} size={20} className="text-ink-subtle" />}
            >
              <span className="block font-bold">Delivery</span>
              <span className="block text-caption font-normal text-ink-muted">Entregamos no endereço do cliente</span>
            </OptionCard>
            <OptionCard
              selected={form.accepts_pickup}
              onSelect={() => set("accepts_pickup", !form.accepts_pickup)}
              trailing={<Icon icon={ShoppingBag} size={20} className="text-ink-subtle" />}
            >
              <span className="block font-bold">Retirada no balcão</span>
              <span className="block text-caption font-normal text-ink-muted">O cliente busca o pedido</span>
            </OptionCard>
            <OptionCard
              selected={form.accepts_dine_in}
              onSelect={() => set("accepts_dine_in", !form.accepts_dine_in)}
              trailing={<Icon icon={UtensilsCrossed} size={20} className="text-ink-subtle" />}
            >
              <span className="block font-bold">Consumo no local</span>
              <span className="block text-caption font-normal text-ink-muted">Pedidos pela mesa, via QR Code</span>
            </OptionCard>
            {errors.accepts_delivery && (
              <p role="alert" className="text-caption font-semibold text-danger">
                {errors.accepts_delivery}
              </p>
            )}
          </fieldset>

          <fieldset className="grid gap-4.5 sm:grid-cols-3">
            <legend className="eyebrow mb-3.5 text-ink-subtle">Valores e tempo</legend>
            <FormField label="Pedido mínimo (R$)" htmlFor="min_order" error={errors.min_order_cents} hint="0 = sem mínimo">
              <Input
                size="lg"
                name="min_order"
                inputMode="decimal"
                placeholder="0,00"
                value={form.min_order}
                onChange={(e) => set("min_order", e.target.value.replace(/[^\d.,]/g, ""))}
                onBlur={() => set("min_order", centsToInput(parseMoneyToCents(form.min_order)))}
              />
            </FormField>
            <FormField label="Tempo médio (min)" htmlFor="avg_prep" error={errors.avg_prep_minutes}>
              <Input
                size="lg"
                name="avg_prep"
                inputMode="numeric"
                placeholder="30"
                value={form.avg_prep}
                onChange={(e) => set("avg_prep", onlyDigits(e.target.value).slice(0, 3))}
              />
            </FormField>
            {form.accepts_delivery && (
              <FormField
                label="Taxa de entrega (R$)"
                htmlFor="delivery_fee"
                error={errors.default_delivery_fee_cents}
                hint="Padrão; ajuste por bairro depois"
              >
                <Input
                  size="lg"
                  name="delivery_fee"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.delivery_fee}
                  onChange={(e) => set("delivery_fee", e.target.value.replace(/[^\d.,]/g, ""))}
                  onBlur={() => set("delivery_fee", centsToInput(parseMoneyToCents(form.delivery_fee)))}
                />
              </FormField>
            )}
          </fieldset>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <p className="text-caption text-ink-muted">
              Fecha depois da meia-noite? Informe normalmente, ex.: 18:00 às 02:00.
            </p>
            <Button variant="ghost" size="sm" onClick={copyFirstOpenDay} disabled={openDays.length < 2}>
              <Copy size={16} strokeWidth={1.8} aria-hidden="true" />
              Repetir o 1º horário
            </Button>
          </div>
          <ul className="flex flex-col gap-2.5">
            {form.hours.map((h) => {
              const day = WEEKDAYS[h.weekday];
              const error = errors[`${HOURS_PREFIX}.w${h.weekday}`];
              return (
                <li
                  key={h.weekday}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border px-3.5 py-3",
                    h.open ? "border-line bg-surface" : "border-line bg-surface-sunken",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
                    <div className="flex min-w-36 flex-1 items-center gap-3">
                      <Switch
                        id={`open-${h.weekday}`}
                        checked={h.open}
                        onCheckedChange={(open) => setDay(h.weekday, { open })}
                        aria-label={`Aberto ${day.label.toLowerCase()}`}
                      />
                      <label htmlFor={`open-${h.weekday}`} className="text-body font-bold text-ink">
                        {day.label}
                      </label>
                    </div>
                    {h.open ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          aria-label={`Abre ${day.label.toLowerCase()}`}
                          wrapperClassName="w-30"
                          value={h.opens_at}
                          invalid={Boolean(error)}
                          onChange={(e) => setDay(h.weekday, { opens_at: e.target.value })}
                        />
                        <span className="text-body-sm text-ink-muted">às</span>
                        <Input
                          type="time"
                          aria-label={`Fecha ${day.label.toLowerCase()}`}
                          wrapperClassName="w-30"
                          value={h.closes_at}
                          invalid={Boolean(error)}
                          onChange={(e) => setDay(h.weekday, { closes_at: e.target.value })}
                        />
                      </div>
                    ) : (
                      <span className="text-body-sm text-ink-faint">Fechado</span>
                    )}
                  </div>
                  {error && (
                    <p role="alert" className="text-caption font-semibold text-danger">
                      {error}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {errors.hours && (
            <p role="alert" className="text-caption font-semibold text-danger">
              {errors.hours}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <Button variant="ghost" size="lg" onClick={() => goTo(step - 1)} disabled={pending}>
            <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
            Voltar
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <Button type="submit" size="xl" loading={pending} className="sm:min-w-56">
          {step < STEPS.length - 1 ? (
            <>
              Continuar
              <ArrowRight size={18} strokeWidth={2.1} aria-hidden="true" />
            </>
          ) : (
            "Criar meu restaurante"
          )}
        </Button>
      </div>
    </form>
  );
}
