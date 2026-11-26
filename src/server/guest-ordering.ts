import "server-only";
import { apiOrigin } from "@/lib/split-deploy";

/** A fila de pedidos fica na API: o front pergunta a ela se os pedidos estão abertos. */
export async function guestOrderingAvailable(): Promise<boolean> {
  try {
    const api = apiOrigin();
    if (!api) return false;
    const response = await fetch(`${api}/api/health`, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5_000) });
    return response.ok && (await response.json())?.ordering === true;
  } catch {
    return false;
  }
}
