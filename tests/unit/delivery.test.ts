import { describe, expect, it } from "vitest";
import { asDeliveryAddress, cityLine, collectionFor, mapsUrl, splitDeliverySections, streetLine, type DeliveryOrder } from "@/lib/delivery";

const address = asDeliveryAddress({
  street: "Rua Augusta",
  number: "900",
  complement: "Apto 81",
  neighborhood: "Consolação",
  city: "São Paulo",
  state: "SP",
  cep: "01305-100",
  reference: " ",
});

const order = (over: Partial<DeliveryOrder>): DeliveryOrder => ({
  id: "o",
  number: 1063,
  status: "OUT_FOR_DELIVERY",
  customer_name: "Ana Souza",
  customer_phone: "11987654321",
  address,
  notes: null,
  payment_method: "CASH",
  change_for_cents: 5000,
  total_cents: 3990,
  created_at: "2026-10-05T18:00:00Z",
  ready_at: "2026-10-05T18:30:00Z",
  out_for_delivery_at: "2026-10-05T18:35:00Z",
  delivered_at: null,
  payment: { id: "p", provider: "offline", method: "CASH", status: "PENDING", amount_cents: 3990 },
  ...over,
});

describe("address helpers", () => {
  it("formats lines and drops blank fields", () => {
    expect(address?.reference).toBeUndefined();
    expect(streetLine(address)).toBe("Rua Augusta, 900 · Apto 81");
    expect(cityLine(address)).toBe("São Paulo/SP · CEP 01305-100");
  });
  it("builds a Google Maps search link", () => {
    const url = mapsUrl(address)!;
    expect(url.startsWith("https://www.google.com/maps/search/?api=1&query=")).toBe(true);
    expect(decodeURIComponent(url.split("query=")[1])).toBe("Rua Augusta, 900, Consolação, São Paulo, SP, 01305-100");
    expect(mapsUrl(null)).toBeNull();
  });
});

describe("collectionFor", () => {
  it("computes amount and change for pending cash", () => {
    expect(collectionFor(order({}))).toEqual({ amountCents: 3990, changeForCents: 5000, changeCents: 1010, method: "CASH" });
  });
  it("is null for online or already paid payments", () => {
    expect(collectionFor(order({ payment: { id: "p", provider: "development", method: "PIX", status: "PENDING", amount_cents: 3990 } }))).toBeNull();
    expect(collectionFor(order({ payment: { id: "p", provider: "offline", method: "CASH", status: "PAID", amount_cents: 3990 } }))).toBeNull();
  });
  it("has no change for card on delivery", () => {
    const c = collectionFor(order({ payment: { id: "p", provider: "offline", method: "CARD_ON_DELIVERY", status: "PENDING", amount_cents: 4740 } }));
    expect(c?.changeCents).toBeNull();
    expect(c?.amountCents).toBe(4740);
  });
});

describe("splitDeliverySections", () => {
  it("groups by status", () => {
    const s = splitDeliverySections([
      order({ id: "a", status: "READY" }),
      order({ id: "b" }),
      order({ id: "c", status: "DELIVERED", delivered_at: "2026-10-05T19:00:00Z" }),
    ]);
    expect(s.ready.map((o) => o.id)).toEqual(["a"]);
    expect(s.onRoute.map((o) => o.id)).toEqual(["b"]);
    expect(s.delivered.map((o) => o.id)).toEqual(["c"]);
  });

  it("caps settled deliveries but always keeps payments still to collect", () => {
    const paid = { id: "p", provider: "offline", method: "CASH", status: "PAID", amount_cents: 3990 } as const;
    const settled = Array.from({ length: 3 }, (_, i) =>
      order({ id: `s${i}`, status: "DELIVERED", delivered_at: `2026-10-05T2${i}:00:00Z`, payment: paid }),
    );
    const pending = order({ id: "old", status: "DELIVERED", delivered_at: "2026-10-05T12:00:00Z" });
    const s = splitDeliverySections([pending, ...settled], 2);
    expect(s.delivered.map((o) => o.id)).toEqual(["s2", "s1", "old"]);
    expect(s.deliveredCount).toBe(4);
  });
});
