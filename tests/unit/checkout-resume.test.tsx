import { createHash, webcrypto } from "node:crypto";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCheckoutAttempt, saveCheckoutAttempt } from "@/components/checkout/checkout-attempt";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { submitQueuedOrder } from "@/components/checkout/submit-queued-order";
import { getCartStore, resetCartStoresForTests } from "@/stores/cart";
import type { PublicRestaurant } from "@/server/queries/public-menu";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
// The checkout imports a server action; in the browser bundle Next replaces it with a call stub.
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/components/cart/use-quote", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/components/cart/use-quote")>();
  const retry = vi.fn();
  return {
    ...original,
    useQuote: () => ({
      key: "test-quote", currentKey: "test-quote", quote: null, loading: false,
      error: { code: "NETWORK", message: "Não foi possível cotar o pedido." }, retry, retrying: false,
    }),
  };
});

const slug = "restaurante-teste";
const key = "0f284cf4-6f04-45cb-996a-6893ff763123";
const orderId = "f8b33185-7e54-4a1d-b4f0-5c083cd98c80";
const restaurant: PublicRestaurant = {
  id: orderId, slug, name: "Restaurante teste", status: "CLOSED", timezone: "America/Sao_Paulo",
  description: null, logoUrl: null, bannerUrl: null, primaryColor: null, whatsapp: null, phone: null,
  addressLine: null, minOrderCents: 0, avgPrepMinutes: 30, acceptsDelivery: false, acceptsPickup: true,
  acceptsDineIn: false, acceptsScheduling: false, paymentMethods: ["CASH"], hours: [], deliveryMinutes: null,
};

function renderClosedCheckout() {
  return render(
    <CheckoutView
      buyerId="guest"
      restaurant={restaurant}
      openState={{ kind: "closed", label: "Fechado", canSchedule: false }}
      paymentMode={{ provider: "development", onlineAvailable: false, emailRequiredForPix: false }}
    />,
  );
}

describe("retomada da tentativa no checkout", () => {
  beforeEach(() => {
    replace.mockClear();
    const cart = getCartStore(slug);
    cart.getState().setType("PICKUP");
    cart.getState().add({
      productId: orderId, variantId: null, name: "Item teste", variantName: null, imageUrl: null,
      quantity: 1, notes: "", addons: [], unitPriceCents: 1000,
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    resetCartStoresForTests();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("consulta após recarregar com loja fechada e cotação indisponível, e limpa o carrinho só na confirmação", async () => {
    // Older stored attempts also resume even without the accepted flag.
    saveCheckoutAttempt("guest", slug, { key, fingerprint: "previous", pending: true });
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json({ state: "pending" }, { status: 202 }))
      .mockResolvedValueOnce(Response.json({ orderId }));
    vi.stubGlobal("fetch", request);

    const { container } = renderClosedCheckout();
    const lookup = await screen.findByRole("button", { name: "Consultar pedido" });
    await waitFor(() => expect(lookup).toBeEnabled());
    expect(screen.getByText("6893FF763123")).toBeInTheDocument();
    expect(container.innerHTML).not.toContain(key);
    expect(screen.getByRole("button", { name: "Confirmar pedido" })).toBeDisabled();
    expect(getCartStore(slug).getState().items).toHaveLength(1);
    expect(loadCheckoutAttempt("guest", slug)?.accepted).toBe(true);

    fireEvent.click(lookup);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/cardapio/${slug}/confirmacao?id=${orderId}`));
    expect(getCartStore(slug).getState().items).toHaveLength(0);
    expect(loadCheckoutAttempt("guest", slug)).toBeNull();
    expect(request.mock.calls.map(([url, options]) => [url, options.headers["Idempotency-Key"], options.method])).toEqual([
      ["/api/orders/status", key, undefined],
      ["/api/orders/status", key, undefined],
    ]);
  });

  it("preserva a tentativa durante a queda de rede e consulta novamente ao reconectar", async () => {
    saveCheckoutAttempt("guest", slug, { key, fingerprint: "previous", pending: true, accepted: true });
    const request = vi.fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(Response.json({ state: "pending" }, { status: 202 }));
    vi.stubGlobal("fetch", request);

    renderClosedCheckout();
    expect(await screen.findByText(/Sem conexão/)).toBeInTheDocument();
    expect(getCartStore(slug).getState().items).toHaveLength(1);
    expect(loadCheckoutAttempt("guest", slug)?.key).toBe(key);
    expect(replace).not.toHaveBeenCalled();

    await act(async () => window.dispatchEvent(new Event("online")));
    expect(screen.queryByText(/Sem conexão/)).toBeNull();
    expect(screen.getByRole("button", { name: "Consultar pedido" })).toBeEnabled();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith("/api/orders/status", expect.objectContaining({ headers: { "Idempotency-Key": key } }));
  });

  it("encerra a espera após um minuto sem reenviar o pedido", async () => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ state: "pending" }, { status: 202, headers: { "Retry-After": "10" } }));
    vi.stubGlobal("fetch", request);
    const accepted = vi.fn();

    const result = submitQueuedOrder({ key, fingerprint: "original" }, { restaurant_slug: slug }, accepted);
    await vi.advanceTimersByTimeAsync(60_000);
    const response = await result;
    expect((await response.json()).error).toEqual({ code: "ORDER_PENDING", message: expect.stringContaining("Consultar pedido") });
    expect(accepted).toHaveBeenCalledOnce();
    expect(request.mock.calls).toHaveLength(7);
    expect(request.mock.calls.slice(1).every(([url]) => url === "/api/orders/status")).toBe(true);
  });

  it("só reenvia uma tentativa não localizada com a mesma chave e os mesmos dados originais", async () => {
    const original = { restaurant_slug: slug };
    const fingerprint = createHash("sha256").update(JSON.stringify(original)).digest("hex");
    const attempt = { key, fingerprint, pending: true };
    const request = vi.fn<typeof fetch>().mockImplementation(async (_url, options) =>
      options?.method === "POST"
        ? Response.json({ orderId }, { status: 201 })
        : Response.json({ error: { code: "ATTEMPT_NOT_FOUND" } }, { status: 404 }),
    );
    vi.stubGlobal("fetch", request);
    vi.stubGlobal("crypto", webcrypto);

    expect((await submitQueuedOrder({ ...attempt, accepted: true }, original, vi.fn())).status).toBe(404);
    expect((await submitQueuedOrder(attempt, { ...original, notes: "Alterado" }, vi.fn())).status).toBe(503);
    expect(request).toHaveBeenCalledTimes(2);

    expect((await submitQueuedOrder(attempt, original, vi.fn())).status).toBe(201);
    expect(request).toHaveBeenCalledTimes(4);
    expect(request).toHaveBeenLastCalledWith("/api/orders", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(original),
      headers: expect.objectContaining({ "Idempotency-Key": key }),
    }));
  });
});
