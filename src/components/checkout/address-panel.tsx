"use client";

import { locateGuestAddress } from "@/server/actions/guest-address";
import styles from "./checkout-layout.module.css";

import { useEffect, useRef, useState } from "react";
import type { QuoteAddress } from "@/components/cart/use-quote";
import { ResponsiveSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  checkoutAddressSchema, deleteSavedAddress, EMPTY_CHECKOUT_ADDRESS, loadSavedAddresses, saveAddress,
  type CheckoutAddress,
} from "./checkout-preferences";
import { addressFromDevice } from "./device-location";

export { EMPTY_CHECKOUT_ADDRESS, type CheckoutAddress } from "./checkout-preferences";

export interface AddressPanelProps {
  buyerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: Partial<QuoteAddress>;
  onConfirm: (address: CheckoutAddress) => void;
  serverError?: string;
  initialErrors?: Record<string, string | undefined>;
  /** The point came from the device GPS: typing the house number keeps it (it is already exact). */
  devicePoint?: boolean;
}

const fields = [
  ["cep", "CEP", "postal-code"], ["street", "Rua", "address-line1"], ["number", "Número", "off"],
  ["complement", "Complemento", "address-line2"], ["neighborhood", "Bairro", "address-level3"],
  ["city", "Cidade", "address-level2"], ["state", "UF", "address-level1"], ["reference", "Referência", "off"],
] as const;
const sameAddress = (a: CheckoutAddress, b: CheckoutAddress) => ["cep", "street", "number", "complement", "city", "state"].every((key) => String(a[key as keyof CheckoutAddress] ?? "").trim().toLowerCase() === String(b[key as keyof CheckoutAddress] ?? "").trim().toLowerCase());
const requiredFields = new Set(["cep", "street", "number", "neighborhood", "city"]);

function AddressEditor({ buyerId, value, onConfirm, onOpenChange, serverError, initialErrors, devicePoint = false }: Omit<AddressPanelProps, "open">) {
  const [draft, setDraft] = useState<CheckoutAddress>(() => ({ ...EMPTY_CHECKOUT_ADDRESS, ...value }));
  const [gpsPoint, setGpsPoint] = useState(devicePoint);
  const [gpsStatus, setGpsStatus] = useState<{ busy: boolean; message: string }>({ busy: false, message: "" });
  async function fillFromMyLocation() {
    setGpsStatus({ busy: true, message: "Buscando sua localização…" });
    const result = await addressFromDevice();
    if (!result.ok) { setGpsStatus({ busy: false, message: result.message }); return; }
    replaceDraft({ ...result.address, number: result.address.number ?? "" });
    setGpsPoint(result.located);
    setGpsStatus({ busy: false, message: result.address.number ? "Endereço encontrado. Confira os dados." : "Endereço encontrado. Informe o número." });
  }
  const [saved, setSaved] = useState(() => loadSavedAddresses(buyerId));
  const [errors, setErrors] = useState<Record<string, string>>(Object.fromEntries(Object.entries(initialErrors ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]))));
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [initialFocus] = useState(() => Object.entries(initialErrors ?? {}).find(([, message]) => message)?.[0]);
  useEffect(() => { if (initialFocus) document.getElementById(`checkout-address-${initialFocus}`)?.focus(); }, [initialFocus]);
  const [cepStatus, setCepStatus] = useState("");
  const [lookup, setLookup] = useState<{ key: string; message: string }>();
  const [saveLocally, setSaveLocally] = useState(true);
  const revision = useRef(0);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { revision.current++; request.current?.abort(); }, []);

  const { cep, street, number, neighborhood, city, state, latitude, longitude } = draft;
  const addressKey = JSON.stringify([cep, street, number, neighborhood, city, state]);
  const hasPoint = latitude != null && longitude != null;
  const addressReady = checkoutAddressSchema.safeParse({ cep, street, number, neighborhood, city, state }).success;
  const locating = addressReady && !hasPoint && lookup?.key !== addressKey;
  const suggestion = lookup?.key === addressKey ? lookup : undefined;
  useEffect(() => {
    if (!addressReady || hasPoint) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const result = await locateGuestAddress({ cep, street, number, neighborhood, city, state });
        if (!active) return;
        if (!result.ok) {
          setLookup({ key: addressKey, message: "Não foi possível localizar o ponto. Confira o endereço antes de continuar." });
          return;
        }
        const { latitude, longitude, approximate } = result.data;
        const point = { latitude, longitude };
        setLookup({ key: addressKey, message: approximate
          ? "A busca encontrou a rua, mas não confirmou o número. Confira o endereço antes de continuar."
          : "Endereço localizado." });
        if (!approximate) setDraft((current) => current.latitude != null && current.longitude != null
          ? current : { ...current, ...point });
      } catch {
        if (active) setLookup({ key: addressKey, message: "Busca de localização indisponível. Você pode continuar com o endereço informado." });
      }
    }, 700);
    return () => { active = false; window.clearTimeout(timer); };
  }, [addressKey, addressReady, hasPoint, cep, street, number, neighborhood, city, state]);

  function replaceDraft(address: Partial<CheckoutAddress>, id?: string) {
    revision.current++;
    request.current?.abort();
    setCepStatus(""); setLookup(undefined);
    setDraft({ ...EMPTY_CHECKOUT_ADDRESS, ...address });
    setSelectedId(id);
    setErrors({});
  }

  async function lookupCep(raw: string, editRevision: number) {
    request.current?.abort();
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8) { setCepStatus(""); return; }
    const controller = new AbortController();
    request.current = controller;
    setCepStatus("Buscando CEP…");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
      if (!response.ok) throw Error("CEP indisponível");
      const data: unknown = await response.json();
      if (revision.current !== editRevision || controller.signal.aborted) return;
      if (!data || typeof data !== "object" || "erro" in data) throw Error("CEP não encontrado");
      const result = data as Record<string, unknown>;
      const filled: Partial<CheckoutAddress> = {};
      for (const [field, remote] of [["street", "logradouro"], ["neighborhood", "bairro"], ["city", "localidade"], ["state", "uf"]] as const) {
        if (typeof result[remote] === "string" && result[remote].trim()) filled[field] = result[remote].slice(0, field === "state" ? 2 : 200);
      }
      setDraft((current) => ({ ...current, ...filled }));
      setCepStatus("Confira o endereço e informe o número.");
    } catch {
      if (revision.current === editRevision && !controller.signal.aborted) setCepStatus("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
    }
  }

  function change(field: keyof CheckoutAddress, raw: string) {
    const value = field === "cep" ? raw.replace(/\D/g, "").slice(0, 8) : field === "state" ? raw.toUpperCase() : raw;
    const currentRevision = ++revision.current;
    request.current?.abort();
    // A GPS point is exact: completing the house number does not move it; changing the street does.
    const keepsGpsPoint = gpsPoint && field === "number";
    const movesPoint = !keepsGpsPoint && ["cep","street","number","neighborhood","city","state"].includes(field);
    if (movesPoint) setGpsPoint(false);
    setDraft((current) => ({ ...current, [field]: value, ...(movesPoint ? { latitude: undefined, longitude: undefined } : {}) }));
    setSelectedId(undefined);
    if (movesPoint) setLookup(undefined);
    setErrors((current) => ({ ...current, [field]: "", storage: "" }));
    setCepStatus("");
    if (field === "cep") void lookupCep(value, currentRevision);
  }

  async function confirm() {
    if (saving || locating) return;
    const result = checkoutAddressSchema.safeParse(draft);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.path[0] === "cep" || issue.path[0] === "state" ? issue.message : "Preencha este campo (até 200 caracteres; número até 20)."])));
      return;
    }
    if (saveLocally) {
      setSaving(true);
      try {
        saveAddress(buyerId, result.data, selectedId);
      } catch { setErrors({ storage: "Não foi possível salvar o endereço neste navegador. Tente novamente." }); return; }
      finally { setSaving(false); }
    }
    onConfirm(result.data);
    onOpenChange(false);
  }

  return <div className="flex flex-col gap-5">
    <p className="text-caption text-ink-muted">Você pode salvar o endereço neste navegador para as próximas compras.</p>
    {saved.length > 0 && <div className="flex flex-col gap-2" aria-label="Endereços salvos">
      {saved.map((address) => <div key={address.id} className="flex items-center gap-2 rounded-lg border border-line p-3">
        <button type="button" className="min-w-0 flex-1 text-left text-body-sm text-ink focus-visible:outline-accent" aria-pressed={selectedId === address.id} onClick={() => replaceDraft(address, address.id)}>
          <span className="block font-bold">{address.street}, {address.number}</span>
          <span className="block text-caption text-ink-muted">{address.neighborhood} · {address.city}{address.state ? `/${address.state}` : ""}</span>
          <span className="text-caption text-brand">Selecionar ou editar</span>
        </button>
        <Button variant="ghost" size="sm" aria-label={`Remover ${address.street}, ${address.number}`} onClick={async () => {

          for (const local of loadSavedAddresses(buyerId).filter((entry) => sameAddress(entry,address))) deleteSavedAddress(buyerId,local.id);
          deleteSavedAddress(buyerId, address.id);
          setSaved((current) => current.filter((entry) => entry.id !== address.id));
          if (selectedId === address.id) setSelectedId(undefined);
        }}>Remover</Button>
      </div>)}
    </div>}
    <div className="flex flex-col gap-2">
      <Button variant="outline" loading={gpsStatus.busy} disabled={gpsStatus.busy} onClick={() => { void fillFromMyLocation(); }}>Usar minha localização</Button>
      {gpsStatus.message && <p role="status" className="text-caption text-ink-muted">{gpsStatus.message}</p>}
    </div>
    <Button variant="outline" onClick={() => { replaceDraft(EMPTY_CHECKOUT_ADDRESS); setGpsPoint(false); }}>Adicionar novo endereço</Button>
    <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void confirm(); }} noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(([field, label, autoComplete]) => <FormField key={field} htmlFor={`checkout-address-${field}`} label={label} required={requiredFields.has(field)} error={errors[field]}>
          <Input size="lg" autoComplete={autoComplete} value={draft[field] ?? ""} maxLength={field === "cep" ? 9 : field === "state" ? 2 : field === "number" ? 20 : 200} inputMode={field === "cep" ? "numeric" : undefined} onChange={(event) => change(field, event.target.value)} />
        </FormField>)}
      </div>
      <p role="status" className="text-body-sm text-ink-muted">{locating ? "Localizando endereço…" : suggestion?.message}</p>
      <p role="status" className="text-caption text-ink-muted">{cepStatus}</p>
      <label className="flex items-center gap-2 text-body-sm text-ink"><input type="checkbox" checked={saveLocally} onChange={(event) => setSaveLocally(event.target.checked)} />Salvar este endereço neste navegador</label>
      {(errors.storage || serverError) && <p role="alert" className="text-body-sm text-danger">{errors.storage || serverError}</p>}
      <div className="flex gap-2 border-t border-line pt-4">
        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="submit" loading={saving || locating} disabled={saving || locating} className="flex-1">Usar este endereço</Button>
      </div>
    </form>
  </div>;
}

export function AddressPanel({ open, ...props }: AddressPanelProps) {
  return <ResponsiveSheet open={open} onOpenChange={props.onOpenChange} title="Endereço de entrega" size="md" className={styles.checkoutDialog}>
    {open && <AddressEditor key={props.buyerId} {...props} />}
  </ResponsiveSheet>;
}


