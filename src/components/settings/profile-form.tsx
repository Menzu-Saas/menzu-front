"use client";

import { AtSign, Check, CircleAlert, LoaderCircle, Phone, Plus, Store } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormField, Icon, ImagePlaceholder, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { BRAND_SWATCHES, SLUG_PATTERN } from "@/lib/schemas/settings";
import { slugify } from "@/lib/slug";
import { checkSlugAction, suggestSlugAction, updateProfileAction } from "@/server/actions/settings";
import type { RestaurantSettings } from "@/server/queries/settings";
import { ImageField } from "./image-field";
import { ColorPicker } from "./color-picker";
import { maskPhone, SaveButton, SettingsSection, useSave } from "./shared";
import { useRestaurantId } from "@/components/admin/current-restaurant";

type SlugState = "idle" | "checking" | "available" | "taken" | "invalid";

export interface ProfileFormProps {
  restaurant: RestaurantSettings;
  /** Menu origin shown in the slug preview, e.g. "menzu.app". */
  menuHost: string;
  addressLine: string;
}

export function ProfileForm({ restaurant, menuHost, addressLine }: ProfileFormProps) {
  const rid = useRestaurantId();
  const initial = {
    name: restaurant.name,
    description: restaurant.description ?? "",
    phone: restaurant.phone ? formatPhone(restaurant.phone) : "",
    whatsapp: restaurant.whatsapp ? formatPhone(restaurant.whatsapp) : "",
    instagram: restaurant.instagram ? `@${restaurant.instagram.replace(/^@/, "")}` : "",
    slug: restaurant.slug,
    primary_color: restaurant.primary_color,
  };
  const [form, setForm] = useState(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerButton = useRef<HTMLButtonElement>(null);
  const [logo, setLogo] = useState(restaurant.logo_url);
  const [banner, setBanner] = useState(restaurant.banner_url);
  const [checked, setChecked] = useState<{ slug: string; available: boolean } | null>(null);
  const { pending, errors, save, clear } = useSave();
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const slugState: SlugState =
    form.slug === restaurant.slug
      ? "idle"
      : !SLUG_PATTERN.test(form.slug)
        ? "invalid"
        : checked?.slug === form.slug
          ? checked.available
            ? "available"
            : "taken"
          : "checking";

  useEffect(() => {
    if (form.slug === restaurant.slug || !SLUG_PATTERN.test(form.slug)) return;
    let cancelled = false;
    const slug = form.slug;
    const timer = setTimeout(() => {
      checkSlugAction(rid, slug).then(
        (r) => !cancelled && setChecked({ slug, available: r.valid && r.available }),
        // Unknown (offline / server error): don't block saving; the server re-checks the slug on save.
        () => !cancelled && setChecked({ slug, available: true }),
      );
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.slug, restaurant.slug, rid]);

  // O endereço acompanha o nome: se já estiver em uso por outro restaurante, ganha um número.
  const [followName, setFollowName] = useState<string | null>(null);
  useEffect(() => {
    if (followName === null) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      suggestSlugAction(rid, followName).then(
        (slug) => {
          if (!cancelled && slug) setForm((f) => (f.name === followName ? { ...f, slug } : f));
        },
        // Sem conexão: fica o endereço do nome; o servidor confere de novo ao salvar.
        () => {},
      );
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [followName, rid]);

  function setName(name: string) {
    const unchanged = name.trim() === restaurant.name.trim();
    const next = slugify(name);
    setForm((f) => ({ ...f, name, slug: unchanged ? restaurant.slug : next.length >= 3 ? next : f.slug }));
    setFollowName(unchanged ? null : name);
    clear("name");
    clear("slug");
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    clear(key);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(() => updateProfileAction(rid, form), "Perfil da loja salvo.");
  }

  // Cor escolhida fora das prontas: a última bolinha passa a mostrá-la.
  const customColor = form.primary_color && !BRAND_SWATCHES.some((s) => s.value === form.primary_color) ? form.primary_color : null;

  const slugHint =
    slugState === "checking" ? (
      <span className="inline-flex items-center gap-1.5 text-ink-muted">
        <Icon icon={LoaderCircle} size={16} className="animate-spin" /> Verificando disponibilidade…
      </span>
    ) : slugState === "available" ? (
      <span className="inline-flex items-center gap-1.5 font-semibold text-success">
        <Icon icon={Check} size={16} /> Disponível · links e QR Codes antigos continuam funcionando
      </span>
    ) : slugState === "taken" ? (
      <span className="inline-flex items-center gap-1.5 font-semibold text-danger">
        <Icon icon={CircleAlert} size={16} /> Este endereço já está em uso
      </span>
    ) : (
      <>
        Seu cardápio:{" "}
        <span className="break-all font-mono text-ink-secondary">
          {menuHost ? `${menuHost}/cardapio/${form.slug || "seu-restaurante"}` : "Cardápio público não conectado"}
        </span>
      </>
    );

  return (
    <SettingsSection id="perfil" title="Perfil da loja" className="xl:col-span-2">
      {/* Logo row (P5): 56px tile r18 + name + address line */}
      <div className="flex flex-col gap-4">
        <div className="relative overflow-hidden rounded-3xl border border-line">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element -- Storage public URL
            <img src={banner} alt="Capa do cardápio" className="aspect-3/1 w-full object-cover sm:aspect-4/1" />
          ) : (
            <ImagePlaceholder kind="cover" label="Capa" className="aspect-3/1 w-full sm:aspect-4/1" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex min-w-0 flex-1 basis-60 items-center gap-3.5">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- Storage public URL
              <img src={logo} alt="Logo" className="size-14 shrink-0 rounded-3xl border border-brand-soft-border object-cover" />
            ) : (
              <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-3xl border border-brand-soft-border bg-brand-soft font-mono text-placeholder text-stripe-food-ink">
                LOGO
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-subheading text-ink">{form.name || restaurant.name}</p>
              <p className="truncate text-caption text-ink-muted">{addressLine || "Endereço não informado"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col">
            <ImageField kind="logo" restaurantId={restaurant.id} hasImage={Boolean(logo)} onChange={setLogo} />
            <ImageField kind="banner" restaurantId={restaurant.id} hasImage={Boolean(banner)} onChange={setBanner} />
          </div>
        </div>
        <p className="text-caption text-ink-muted">JPG, PNG ou WEBP até 3 MB. Logo quadrado; capa na horizontal (3:1).</p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-4.5 border-t border-line pt-5">
        <div className="grid gap-4.5 md:grid-cols-2">
          <FormField label="Nome do restaurante" htmlFor="profile-name" error={errors.name} required>
            <Input leftIcon={Store} value={form.name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Endereço do cardápio" htmlFor="profile-slug" error={errors.slug} hint={slugHint} required>
            <Input
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
              invalid={slugState === "taken" || slugState === "invalid" ? true : undefined}
              value={form.slug}
              onChange={(e) => {
                setFollowName(null);
                set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50));
              }}
            />
          </FormField>
        </div>
        <FormField label="Descrição" htmlFor="profile-description" error={errors.description} hint="Aparece no topo do cardápio. Até 500 caracteres.">
          <Textarea
            rows={3}
            maxLength={500}
            placeholder="Hambúrgueres artesanais na brasa desde 2015."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </FormField>
        <div className="grid gap-4.5 md:grid-cols-3">
          <FormField label="Telefone" htmlFor="profile-phone" error={errors.phone} required>
            <Input type="tel" inputMode="tel" leftIcon={Phone} placeholder="(11) 98765-4321" value={form.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} />
          </FormField>
          <FormField label="WhatsApp" htmlFor="profile-whatsapp" error={errors.whatsapp}>
            <Input type="tel" inputMode="tel" leftIcon={Phone} placeholder="(11) 98765-4321" value={form.whatsapp} onChange={(e) => set("whatsapp", maskPhone(e.target.value))} />
          </FormField>
          <FormField label="Instagram" htmlFor="profile-instagram" error={errors.instagram}>
            <Input leftIcon={AtSign} autoCapitalize="none" placeholder="@seurestaurante" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </FormField>
        </div>

        <fieldset
          className="flex flex-col gap-3"
          onKeyDown={(e) => {
            if (e.key !== "Escape" || !pickerOpen) return;
            setPickerOpen(false);
            pickerButton.current?.focus();
          }}
        >
          <legend className="mb-2 text-body-sm font-bold text-ink">Cor principal</legend>
          <p className="-mt-1 text-caption text-ink-muted">Usada só como destaque no topo do seu cardápio público.</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              aria-pressed={form.primary_color === null}
              onClick={() => set("primary_color", null)}
              className={cn(
                "inline-flex h-9 items-center rounded-md border px-3 text-caption font-bold transition-colors duration-150 ease-out",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                form.primary_color === null ? "border-inverse bg-inverse text-white" : "border-line bg-surface-muted text-ink-secondary hover:border-line-strong",
              )}
            >
              Padrão
            </button>
            {BRAND_SWATCHES.map((s) => {
              const active = form.primary_color === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={active}
                  aria-label={s.label}
                  title={s.label}
                  onClick={() => set("primary_color", s.value)}
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-full border-2 transition-transform duration-150 ease-out active:translate-y-px",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    active ? "border-ink" : "border-surface ring-1 ring-line",
                  )}
                  style={{ backgroundColor: s.value }}
                >
                  {active && <Icon icon={Check} size={16} className="text-white" />}
                </button>
              );
            })}
            <button
              ref={pickerButton}
              type="button"
              aria-label="Mais cores"
              title="Mais cores"
              aria-expanded={pickerOpen}
              aria-controls="profile-color"
              onClick={() => setPickerOpen((open) => !open)}
              className={cn(
                "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-transform duration-150 ease-out active:translate-y-px",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                pickerOpen || customColor ? "border-ink" : "border-surface ring-1 ring-line",
                !customColor && "mz-color-wheel",
              )}
              style={customColor ? { backgroundColor: customColor } : undefined}
            >
              {/* A sombra mantém o "+" visível em cores claras. */}
              <Icon icon={Plus} size={20} className="text-white drop-shadow-[0_0_2px_rgb(0_0_0/0.8)]" />
            </button>
          </div>
          <div id="profile-color" hidden={!pickerOpen}>
            {pickerOpen && <ColorPicker value={form.primary_color ?? ""} onChange={(hex) => set("primary_color", hex)} />}
          </div>
          {errors.primary_color && (
            <p role="alert" className="text-caption font-semibold text-danger">
              {errors.primary_color}
            </p>
          )}
        </fieldset>

        <SaveButton pending={pending} dirty={dirty && slugState !== "taken" && slugState !== "checking"} />
      </form>
    </SettingsSection>
  );
}
