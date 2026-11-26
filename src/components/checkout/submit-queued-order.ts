import type { CheckoutAttempt } from "./checkout-attempt";

export function lookupQueuedOrder(key: string, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(8_000);
  return fetch("/api/orders/status", {
    headers: { "Idempotency-Key": key },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
}

/**
 * `cpf` (só dígitos) vai no corpo apenas na hora do envio, fora do `payload`: assim não entra na
 * impressão digital da tentativa guardada no navegador. O servidor o cifra antes de enfileirar.
 */
export async function submitQueuedOrder(attempt: CheckoutAttempt, payload: unknown, onPending: () => void, cpf?: string) {
  const headers = { "Content-Type": "application/json", "Idempotency-Key": attempt.key };
  let response = attempt.pending ? await lookupQueuedOrder(attempt.key) : null;
  if (attempt.pending && response?.status === 404) {
    const body = await response.clone().json().catch(() => null);
    if (attempt.accepted || body?.error?.code !== "ATTEMPT_NOT_FOUND") return response;
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
    const fingerprint = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (fingerprint !== attempt.fingerprint) {
      return Response.json({ error: { code: "ORDER_UNCONFIRMED", message: "Restaure os dados do pedido original para reenviar a mesma tentativa ou fale com o restaurante." } }, { status: 503 });
    }
  }
  if (!response || response.status === 404) {
    const body = cpf && payload && typeof payload === "object" ? { ...payload, cpf } : payload;
    response = await fetch("/api/orders", { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(8_000) });
  }
  if (response.status !== 202) return response;

  onPending();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const retry = Number(response.headers.get("Retry-After")) || 2;
    await new Promise((resolve) => setTimeout(resolve, Math.min(10, Math.max(1, retry)) * 1000));
    response = await lookupQueuedOrder(attempt.key);
    if (response.status !== 202 && response.status !== 429) return response;
  }
  return Response.json({ error: { code: "ORDER_PENDING", message: "Seu pedido segue na fila. Use Consultar pedido para acompanhar." } }, { status: 503 });
}
