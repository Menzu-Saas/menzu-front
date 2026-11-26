import "server-only";
import type { CheckoutAddress } from "@/components/checkout/checkout-preferences";
import type { DeliveryPoint } from "@/components/checkout/delivery-location-picker";
import type { ActionResult } from "@/server/actions/orders";

// The public Photon service refuses anonymous clients (HTTP 503 without a User-Agent).
const GEOCODER_HEADERS = { "User-Agent": "Menzu/0.1 (delivery address lookup)" };

const UF: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE", "distrito federal": "DF",
  "espirito santo": "ES", goias: "GO", maranhao: "MA", "mato grosso": "MT", "mato grosso do sul": "MS",
  "minas gerais": "MG", para: "PA", paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};

export type DeviceAddress = { street: string; number: string; neighborhood: string; city: string; state: string; cep: string };

/**
 * Address of the buyer's current position, to pre-fill the delivery address. Only the coordinates are sent
 * to the geocoder. Returns null when nothing reliable is found or the service is off.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<DeviceAddress | null> {
  if (process.env.MENZU_GEOCODING_ENABLED !== "true") return null;
  const url = new URL("https://photon.komoot.io/reverse");
  // Several results: the nearest one is often just the neighborhood or a place, without a street.
  url.searchParams.set("lat", latitude.toFixed(6)); url.searchParams.set("lon", longitude.toFixed(6)); url.searchParams.set("limit", "5");
  try {
    // shortcut: public Photon service; use a hosted provider before high-traffic rollout.
    const response = await fetch(url, { cache: "no-store", headers: GEOCODER_HEADERS, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    const features = payload && typeof payload === "object" && "features" in payload && Array.isArray(payload.features) ? payload.features : [];
    const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const props = features
      .map((feature) => feature?.properties as Record<string, unknown> | undefined)
      .filter((p): p is Record<string, unknown> => Boolean(p) && String(p?.countrycode ?? "").toUpperCase() === "BR");
    const streetOf = (p: Record<string, unknown>) => text(p.street, 200) || (p.type === "street" ? text(p.name, 200) : "");
    // Nearest result with a street; the house number comes only from that same result.
    const p = props.find((candidate) => streetOf(candidate) && (text(candidate.city, 200) || text(candidate.county, 200)));
    if (!p) return null;
    const pick = (key: string, max: number) => text(p[key], max) || props.map((other) => text(other[key], max)).find(Boolean) || "";
    const cep = pick("postcode", 12).replace(/\D/g, "");
    return {
      street: streetOf(p),
      city: text(p.city, 200) || text(p.county, 200),
      number: text(p.housenumber, 20),
      neighborhood: pick("district", 200) || pick("locality", 200) || pick("suburb", 200),
      state: UF[fold(pick("state", 60))] ?? "",
      cep: cep.length === 8 ? cep : "",
    };
  } catch {
    return null;
  }
}

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/^(rua|avenida|av|r)\.?\s+/,"").trim();
export async function geocodeDeliveryAddress(address: CheckoutAddress): Promise<ActionResult<DeliveryPoint & { approximate: boolean }>> {
  if (process.env.MENZU_GEOCODING_ENABLED !== "true") return { ok:false, code:"GEOCODING_DISABLED", error:"A busca automática de novos endereços ainda não está habilitada. Selecione o ponto no mapa." };
  const query = [address.street,address.number,address.neighborhood,address.city,address.state,"Brasil"].filter(Boolean).join(", ");
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q",query); url.searchParams.set("limit","5"); url.searchParams.set("bbox","-73.99,-33.75,-34.79,5.28");
  try {
    // shortcut: public Photon service; use a hosted provider before high-traffic rollout.
    const response = await fetch(url,{ cache:"no-store", headers: GEOCODER_HEADERS, signal:AbortSignal.timeout(10000) });
    if (!response.ok) throw Error("Geocoder unavailable");
    const payload: unknown = await response.json();
    const features = payload && typeof payload === "object" && "features" in payload && Array.isArray(payload.features) ? payload.features : [];
    let fallback: (DeliveryPoint & { approximate: boolean }) | undefined;
    for (const feature of features) {
      const coordinates = feature?.geometry?.coordinates; const properties = feature?.properties;
      if (!Array.isArray(coordinates) || coordinates.length<2 || !properties || typeof properties.city!=="string" || fold(properties.city)!==fold(address.city)) continue;
      const [longitude,latitude] = coordinates;
      if (typeof latitude!=="number" || !Number.isFinite(latitude) || Math.abs(latitude)>90 || typeof longitude!=="number" || !Number.isFinite(longitude) || Math.abs(longitude)>180) continue;
      const street = properties.street ?? properties.name;
      if (typeof street!=="string" || !fold(street) || !(fold(street).includes(fold(address.street)) || fold(address.street).includes(fold(street)))) continue;
      const point = { latitude, longitude, approximate: String(properties.housenumber ?? "").trim() !== address.number.trim() };
      if (!point.approximate) return { ok: true, data: point };
      fallback ??= point;
    }
    if (fallback) return { ok: true, data: fallback };
    return {ok:false,code:"ADDRESS_NOT_LOCATED",error:"Não encontramos esse número com segurança. Ajuste o ponto no mapa ou use o GPS no destino."};
  } catch { return {ok:false,code:"GEOCODING_UNAVAILABLE",error:"Não foi possível localizar automaticamente agora. Selecione no mapa ou tente novamente."}; }
}

