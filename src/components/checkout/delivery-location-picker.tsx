"use client";

import { useState } from "react";
import { DeliveryPointMap } from "./delivery-point-map";
import { Button } from "@/components/ui/button";

export type DeliveryPoint = { latitude: number; longitude: number };
export function DeliveryLocationPicker({ onConfirm, confirmed = false, value }: { value?: DeliveryPoint | null; onConfirm: (point: DeliveryPoint) => void | Promise<void>; confirmed?: boolean }) {
  const [point, setPoint] = useState<DeliveryPoint | null>(value ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function locate() {
    if (!navigator.geolocation) { setError("Este navegador não oferece GPS."); return; }
    setBusy(true); setError(""); setPoint(null);
    navigator.geolocation.getCurrentPosition((position) => {
      setBusy(false);
      if (position.coords.accuracy > 50 || Date.now() - position.timestamp > 60_000) { setError("Localização imprecisa. Vá para uma área aberta e tente novamente."); return; }
      setPoint({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    }, () => { setBusy(false); setError("Permita o acesso à localização e tente novamente no local de entrega."); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 });
  }
  return <section aria-label="Ponto de entrega" className="space-y-3 rounded-2xl border border-line bg-surface-sunken p-4">
    <h3 className="text-subheading">Ponto de entrega</h3>
    <p className="text-body-sm text-ink-muted">Escolha no mapa onde o entregador deve entregar seu pedido. Use o GPS como atalho se já estiver no destino.</p>
    <DeliveryPointMap value={point} onSelect={setPoint} />
    {confirmed && <p role="status" className="text-body-sm text-success">Ponto de entrega confirmado.</p>}
    <Button type="button" variant="outline" disabled={busy} loading={busy} onClick={locate}>{confirmed ? "Alterar ponto pelo GPS" : "Localizar meu ponto de entrega"}</Button>
    {point && <div className="space-y-3">
      <a href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=18/${point.latitude}/${point.longitude}`} target="_blank" rel="noopener noreferrer" className="block text-body-sm font-bold text-brand underline">Conferir ponto no mapa</a>
      <Button type="button" disabled={busy} loading={busy} onClick={async () => {
        setBusy(true); setError("");
        try { await onConfirm(point); setPoint(null); } catch { setError("Não foi possível salvar o ponto. Tente novamente."); }
        finally { setBusy(false); }
      }}>Confirmar este ponto de entrega</Button>
    </div>}
    {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
  </section>;
}
