"use client";

import { MapPin } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { FormField, Input } from "@/components/ui";
import { onlyDigits } from "@/lib/phone";
import { updateAddressAction } from "@/server/actions/settings";
import type { RestaurantSettings } from "@/server/queries/settings";
import { maskCep, SaveButton, SettingsSection, useSave } from "./shared";
import { useRestaurantId } from "@/components/admin/current-restaurant";

export function AddressForm({ restaurant }: { restaurant: RestaurantSettings }) {
  const rid = useRestaurantId();
  const initial = {
    address_cep: restaurant.address_cep ? maskCep(restaurant.address_cep) : "",
    address_street: restaurant.address_street ?? "",
    address_number: restaurant.address_number ?? "",
    address_complement: restaurant.address_complement ?? "",
    address_neighborhood: restaurant.address_neighborhood ?? "",
    address_city: restaurant.address_city ?? "",
    address_state: restaurant.address_state ?? "",
  };
  const [form, setForm] = useState(initial);
  const { pending, errors, save, clear } = useSave();
  const lastCep = useRef(onlyDigits(initial.address_cep));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    clear(key);
  }

  async function lookupCep(masked: string) {
    const cep = onlyDigits(masked);
    if (cep.length !== 8 || cep === lastCep.current) return;
    lastCep.current = cep;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) return;
      const data = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (data.erro) return;
      setForm((f) => ({
        ...f,
        address_street: data.logradouro || f.address_street,
        address_neighborhood: data.bairro || f.address_neighborhood,
        address_city: data.localidade || f.address_city,
        address_state: data.uf || f.address_state,
      }));
    } catch {
      // Convenience only: the address can always be typed.
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(() => updateAddressAction(rid, form), "Endereço salvo.");
  }

  const field = (key: keyof typeof form, label: string, props: Partial<Parameters<typeof Input>[0]> = {}) => (
    <FormField label={label} htmlFor={`addr-${key}`} error={errors[key]}>
      <Input value={form[key]} onChange={(e) => set(key, e.target.value)} {...props} />
    </FormField>
  );

  return (
    <SettingsSection id="endereco" title="Endereço" description="Aparece no cardápio e nos pedidos de retirada.">
      <form noValidate onSubmit={submit} className="flex flex-col gap-4.5">
        <div className="grid gap-4.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <FormField label="CEP" htmlFor="addr-address_cep" error={errors.address_cep}>
            <Input
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
          {field("address_street", "Rua", { placeholder: "Av. Paulista", autoComplete: "address-line1" })}
        </div>
        <div className="grid grid-cols-2 gap-4.5">
          {field("address_number", "Número", { placeholder: "1000" })}
          {field("address_complement", "Complemento", { placeholder: "Loja 2" })}
        </div>
        <div className="grid gap-4.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)]">
          {field("address_neighborhood", "Bairro", { placeholder: "Bela Vista" })}
          {field("address_city", "Cidade", { placeholder: "São Paulo" })}
          <FormField label="UF" htmlFor="addr-address_state" error={errors.address_state}>
            <Input
              placeholder="SP"
              maxLength={2}
              value={form.address_state}
              onChange={(e) => set("address_state", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            />
          </FormField>
        </div>
        <SaveButton pending={pending} dirty={dirty} />
      </form>
    </SettingsSection>
  );
}
