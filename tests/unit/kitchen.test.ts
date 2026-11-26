import { describe, expect, it } from "vitest";
import { formatTimer, kitchenSince, kitchenTypeLabel, parseKitchenOrders, splitKitchenColumns, timerTone, type KitchenOrder } from "@/lib/kitchen";

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  number: 1045,
  type: "DINE_IN",
  table_number: 12,
  status: "CONFIRMED",
  created_at: "2026-10-05T18:00:00Z",
  confirmed_at: "2026-10-05T18:01:00Z",
  preparing_at: null,
  ready_at: null,
  scheduled_for: null,
  notes: "Sem pressa",
  customer_first_name: "Maria",
  items: [{ product_name: "Burger", variant_name: null, quantity: 2, notes: "sem cebola", addons: [{ group_name: "Extras", option_name: "Bacon", quantity: 1 }] }],
};

describe("parseKitchenOrders", () => {
  it("keeps only documented fields and drops anything sensitive", () => {
    const [o] = parseKitchenOrders([{ ...base, customer_phone: "11999999999", total_cents: 5000, address: { street: "X" } }]);
    expect(o).not.toHaveProperty("customer_phone");
    expect(o).not.toHaveProperty("total_cents");
    expect(o).not.toHaveProperty("address");
    expect(o.items[0].addons[0].option_name).toBe("Bacon");
    expect(o.customer_first_name).toBe("Maria");
  });

  it("ignores malformed rows and non-array payloads", () => {
    expect(parseKitchenOrders(null)).toEqual([]);
    expect(parseKitchenOrders({})).toEqual([]);
    expect(parseKitchenOrders([{ ...base, status: "NOPE" }, 3, null])).toEqual([]);
  });
});

describe("splitKitchenColumns", () => {
  const mk = (over: Partial<KitchenOrder>): KitchenOrder => ({ ...(parseKitchenOrders([base])[0]), ...over });
  it("splits by status, queues oldest first and limits ready to the latest 10", () => {
    const orders = [
      mk({ id: "a", number: 2, confirmed_at: "2026-10-05T18:05:00Z" }),
      mk({ id: "b", number: 1, confirmed_at: "2026-10-05T18:02:00Z" }),
      mk({ id: "c", status: "PREPARING" }),
      ...Array.from({ length: 12 }, (_, i) =>
        mk({ id: `r${i}`, number: 100 + i, status: "READY", ready_at: `2026-10-05T18:${String(10 + i).padStart(2, "0")}:00Z` }),
      ),
    ];
    const cols = splitKitchenColumns(orders);
    expect(cols.toPrepare.map((o) => o.id)).toEqual(["b", "a"]);
    expect(cols.preparing.map((o) => o.id)).toEqual(["c"]);
    expect(cols.ready).toHaveLength(10);
    expect(cols.ready[0].number).toBe(111);
  });
});

describe("timer helpers", () => {
  it("turns warning at the average prep time and danger at 1.5x", () => {
    expect(timerTone(29 * 60_000, 30)).toBe("normal");
    expect(timerTone(30 * 60_000, 30)).toBe("warning");
    expect(timerTone(45 * 60_000, 30)).toBe("danger");
  });
  it("formats a running clock", () => {
    expect(formatTimer(0)).toBe("00:00");
    expect(formatTimer(247_000)).toBe("04:07");
    expect(formatTimer(3_750_000)).toBe("1:02:30");
  });
  it("labels the order type", () => {
    expect(kitchenTypeLabel({ type: "DINE_IN", table_number: 12 })).toBe("Mesa 12");
    expect(kitchenTypeLabel({ type: "PICKUP", table_number: null })).toBe("Retirada");
    expect(kitchenTypeLabel({ type: "DELIVERY", table_number: null })).toBe("Entrega");
  });
});

describe("kitchenSince", () => {
  const base = { created_at: "2026-10-04T13:00:00.000Z", confirmed_at: "2026-10-04T13:05:00.000Z" };

  it("counts from acceptance for a regular order", () => {
    expect(kitchenSince({ ...base, scheduled_for: null }, 30)).toBe(Date.parse(base.confirmed_at));
  });

  it("counts from the scheduled time minus avg prep for a scheduled order", () => {
    // Scheduled 19:00Z, avg 30 min: the clock starts at 18:30Z (negative until then).
    expect(kitchenSince({ ...base, scheduled_for: "2026-10-04T19:00:00.000Z" }, 30)).toBe(Date.parse("2026-10-04T18:30:00.000Z"));
    // Accepted after that point: from acceptance.
    expect(kitchenSince({ ...base, scheduled_for: "2026-10-04T13:20:00.000Z" }, 30)).toBe(Date.parse(base.confirmed_at));
  });
});
