"use client";

import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Circle, CircleMarker } from "leaflet";
import type { CourierPosition } from "@/lib/courier";
import { deliveryDestination, type DeliveryPoint } from "@/lib/delivery-tracking";
import { cn } from "@/lib/cn";

type MapPoints = { position: CourierPosition | null; destination: DeliveryPoint | null };
function PositionMap({ position, destination }: MapPoints) {
  const container = useRef<HTMLDivElement>(null);
  const current = useRef<MapPoints>({position,destination});
  const layers = useRef<{ sync: (points:MapPoints)=>void; remove:()=>void } | null>(null);
  const [error,setError] = useState("");
  useEffect(()=>{ current.current={position,destination}; layers.current?.sync(current.current); },[position,destination]);
  useEffect(()=>{
    let disposed=false;
    let resize:ResizeObserver|null=null;
    void import("leaflet").then((L)=>{
      if (disposed || !container.current) return;
      const initial=current.current.position ?? current.current.destination!;
      const map=L.map(container.current).setView([initial.latitude,initial.longitude],16);
      // shortcut: public OSM tiles; use a hosted provider before high-traffic rollout.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'})
        .on("tileerror",()=>{if(!disposed)setError("Mapa sem conexão. Use o link de navegação abaixo.");}).addTo(map);
      let courier:CircleMarker|null=null;
      let target:CircleMarker|null=null;
      let accuracy:Circle|null=null;
      const sync=({position,destination}:MapPoints)=>{
        if (position) {
          const point:[number,number]=[position.latitude,position.longitude];
          if (!courier) courier=L.circleMarker(point,{radius:10,color:"#fff",weight:3,fillColor:"#ff6b1a",fillOpacity:1}).addTo(map).bindTooltip("Entregador");
          else courier.setLatLng(point);
          if (!accuracy) accuracy=L.circle(point,{radius:Math.min(position.accuracy,10000),color:"#ff6b1a",weight:1,fillOpacity:0.1}).addTo(map);
          else accuracy.setLatLng(point).setRadius(Math.min(position.accuracy,10000));
        } else {courier?.remove();accuracy?.remove();courier=null;accuracy=null;}
        if (destination) {
          const point:[number,number]=[destination.latitude,destination.longitude];
          if (!target) target=L.circleMarker(point,{radius:10,color:"#fff",weight:3,fillColor:"#18b875",fillOpacity:1}).addTo(map).bindTooltip("Ponto de entrega");
          else target.setLatLng(point);
        } else {target?.remove();target=null;}
        if (position && destination) map.fitBounds([[position.latitude,position.longitude],[destination.latitude,destination.longitude]],{padding:[40,40],maxZoom:17});
        else {const point=position ?? destination;if(point)map.panTo([point.latitude,point.longitude]);}
      };
      layers.current={sync,remove:()=>map.remove()};
      sync(current.current);
      resize=new ResizeObserver(()=>map.invalidateSize());resize.observe(container.current);
    }).catch(()=>{if(!disposed)setError("Não foi possível carregar o mapa. Use o link de navegação abaixo.");});
    return ()=>{disposed=true;resize?.disconnect();layers.current?.remove();layers.current=null;};
  },[]);
  return <><div ref={container} role="region" aria-label="Mapa da localização do entregador" className="relative isolate z-0 h-72 w-full sm:h-96"/>{error&&<p role="status" className="px-4 py-2 text-caption text-danger">{error}</p>}</>;
}

export function CourierMap({position,className,local=false,destination}: {position:CourierPosition|null;className?:string;local?:boolean;destination?:DeliveryPoint|null}) {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);
  const valid=position && deliveryDestination(position) && Number.isFinite(position.accuracy) && position.accuracy>=0 && Number.isFinite(Date.parse(position.recorded_at)) ? position : null;
  const target=deliveryDestination(destination);
  if(!valid&&!target)return <div className={cn("flex min-h-52 flex-col items-center justify-center gap-3 bg-surface-sunken p-5 text-center text-body-sm text-ink-muted",className)}><MapPin aria-hidden="true"/><p>Localização ainda não compartilhada.</p><p className="text-caption">A posição aparecerá quando o GPS do entregador estiver ativo e autorizado.</p></div>;
  const stale=valid && (valid.stale || now-Date.parse(valid.recorded_at)>60000);
  const point=valid ?? target!;
  const coordinates=point.latitude+","+point.longitude;
  return <div className={cn("overflow-hidden bg-surface-sunken",className)}>
    <PositionMap position={valid} destination={target}/>
    <p role="status" className={cn("px-4 py-3 text-caption",stale?"text-danger":"text-ink-muted")}>{valid ? <>{stale?"Sinal desatualizado · última posição conhecida":local?"Localização recebida do GPS deste aparelho":"Posição recebida do entregador"} · {new Date(valid.recorded_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · precisão aproximada de {Math.round(valid.accuracy)} m</> : "Ponto de entrega confirmado. Aguardando localização do entregador."}</p>
    <a className="block px-4 pb-4 text-caption font-bold text-brand underline" href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(coordinates)} target="_blank" rel="noopener noreferrer">{valid?"Abrir última posição no Google Maps":"Abrir ponto de entrega no Google Maps"}</a>
  </div>;
}
