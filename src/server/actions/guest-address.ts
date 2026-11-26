"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { checkoutAddressSchema } from "@/components/checkout/checkout-preferences";
import { geocodeDeliveryAddress, reverseGeocode } from "@/server/geocoding";
import { clientIp, createRateLimiter } from "@/server/rate-limit";

const limit = createRateLimiter({ limit: 12, windowMs: 60_000 });

const coordinates = z.object({
  latitude: z.number().finite().min(-34).max(6),   // Brazil only
  longitude: z.number().finite().min(-74).max(-34),
});

/** Address of the buyer's current position (after the browser permission). Only coordinates travel. */
export async function addressFromLocation(latitude: unknown, longitude: unknown) {
  const parsed = coordinates.safeParse({ latitude, longitude });
  if (!parsed.success) return { ok: false as const, error: "Localização fora da área atendida." };
  if (!limit(clientIp(await headers())).ok) return { ok: false as const, error: "Aguarde um instante antes de tentar de novo." };
  const address = await reverseGeocode(parsed.data.latitude, parsed.data.longitude);
  return address ? { ok: true as const, data: address } : { ok: false as const, error: "Não encontramos o endereço deste ponto. Preencha manualmente." };
}

export async function locateGuestAddress(address: unknown) {
  const parsed = checkoutAddressSchema.safeParse(address);
  if (!parsed.success) return { ok: false as const, error: "Confira os dados do endereço." };
  if (!limit(clientIp(await headers())).ok) {
    return { ok: false as const, error: "Aguarde antes de consultar novamente ou escolha o ponto no mapa." };
  }
  return geocodeDeliveryAddress(parsed.data);
}
