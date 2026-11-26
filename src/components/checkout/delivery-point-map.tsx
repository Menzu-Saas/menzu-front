"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { Button } from "@/components/ui/button";
import type { DeliveryPoint } from "./delivery-location-picker";

export function DeliveryPointMap({ value, onSelect }: { value?: DeliveryPoint | null; onSelect: (point: DeliveryPoint) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const callback = useRef(onSelect);
  const initial = useRef(value);
  const [error, setError] = useState("");
  useEffect(() => { callback.current = onSelect; });
  useEffect(() => {
    let disposed = false;
    let resize: ResizeObserver | null = null;
    void import("leaflet").then((L) => {
      if (disposed || !container.current) return;
      const point = initial.current;
      const instance = L.map(container.current).setView(point ? [point.latitude,point.longitude] : [-14.2,-51.9],point ? 17 : 4);
      map.current = instance;
      // shortcut: public OSM tiles; use a hosted provider before high-traffic rollout.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(instance);
      instance.on("click", (event) => callback.current({ latitude: event.latlng.lat, longitude: event.latlng.lng }));
      resize = new ResizeObserver(() => instance.invalidateSize()); resize.observe(container.current);
    }).catch(() => { if (!disposed) setError("Não foi possível carregar o mapa. Tente reabrir o endereço."); });
    return () => { disposed = true; resize?.disconnect(); map.current?.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    if (value && map.current) map.current.setView([value.latitude,value.longitude],Math.max(map.current.getZoom(),17));
  }, [value]);
  return <div className="space-y-2">
    <div className="relative isolate overflow-hidden rounded-2xl border border-line">
      <div ref={container} role="region" aria-label="Mapa para escolher o ponto de entrega" className="h-72 w-full bg-surface-muted" />
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 z-[500] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-brand p-2 shadow-frame" />
    </div>
    <p className="text-caption text-ink-muted">Toque no destino ou arraste o mapa e use o ponto central. Você pode ampliar com os botões + e −.</p>
    <Button type="button" variant="outline" onClick={() => {
      const center = map.current?.getCenter();
      if (center) callback.current({ latitude: center.lat, longitude: center.lng });
    }}>Selecionar o centro do mapa</Button>
    {error && <p role="alert" className="text-danger">{error}</p>}
  </div>;
}
