"use client";

import { addressFromLocation } from "@/server/actions/guest-address";
import type { CheckoutAddress } from "./checkout-preferences";

export type DeviceLocationResult =
  | { ok: true; address: Partial<CheckoutAddress>; located: boolean }
  | { ok: false; reason: "unsupported" | "denied" | "unavailable"; message: string };

/** Accuracy needed to trust the device point as the delivery spot (meters). */
const MAX_ACCURACY_M = 100;

function position(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
}

/**
 * GPS first; if it fails or times out (common on computers, which have no GPS), tries again with the regular
 * network location. A denied permission is final: asking again would not show the prompt anyway.
 */
async function currentPosition(): Promise<GeolocationPosition> {
  try {
    return await position({ enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 });
  } catch (error) {
    if ((error as GeolocationPositionError)?.code === 1) throw error;
    return position({ enableHighAccuracy: false, maximumAge: 300_000, timeout: 15_000 });
  }
}

/**
 * Shows the browser's location permission prompt (the browser only prompts while the permission is still
 * undecided; once granted it just reads the position). Nothing is sent anywhere. Returns whether it was granted.
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return false;
  try {
    await currentPosition();
    return true;
  } catch {
    return false;
  }
}

/**
 * Asks the browser for the current position (the browser shows the permission prompt) and turns it into a
 * delivery address: street, neighborhood, city, state and CEP from the coordinates, plus the exact point.
 * The house number usually has to be confirmed by the buyer.
 */
export async function addressFromDevice(): Promise<DeviceLocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, reason: "unsupported", message: "Este navegador não oferece localização." };
  }
  let position: GeolocationPosition;
  try {
    position = await currentPosition();
  } catch (error) {
    const denied = (error as GeolocationPositionError)?.code === 1;
    return denied
      ? { ok: false, reason: "denied", message: "A localização está bloqueada neste navegador. Libere no ícone ao lado do endereço do site ou preencha o endereço." }
      : { ok: false, reason: "unavailable", message: "Não foi possível obter sua localização agora. Preencha o endereço manualmente." };
  }
  const { latitude, longitude, accuracy } = position.coords;
  const point = accuracy <= MAX_ACCURACY_M ? { latitude, longitude } : {};
  const found = await addressFromLocation(latitude, longitude).catch(() => null);
  if (!found?.ok) {
    return { ok: false, reason: "unavailable", message: found?.error ?? "Não encontramos o endereço deste ponto. Preencha manualmente." };
  }
  return { ok: true, located: "latitude" in point, address: { ...found.data, ...point } };
}
