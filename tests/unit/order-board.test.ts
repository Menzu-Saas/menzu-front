import { describe, expect, it } from "vitest";
import {
  badgeSuffix,
  boardPrimaryAction,
  boardTypeLabel,
  canCancel,
  dropTargets,
  filterCounts,
  formatElapsed,
  formatBoardSchedule,
  itemsSummary,
  matchesFilter,
  mergeOrderRow,
  sortBoardOrders,
  startOfDayInTimeZone,
  statusSince,
  type BoardOrder,
} from "@/lib/order-board";

const TZ = "America/Sao_Paulo";
const NOW = new Date("2026-10-04T22:45:00.000Z").getTime(); // 19:45 local
const CLOCK = { now: NOW, avgPrepMinutes: 30 };

function order(over: Partial<BoardOrder> = {}): BoardOrder {
  return {
    id: "o1",
    number: 1045,
    status: "PENDING",
    type: "PICKUP",
    customer_name: "Juliana Ferraz",
    customer_phone: "11987654321",
    payment_method: "PIX",
    total_cents: 5352,
    created_at: "2026-10-04T22:42:00.000Z",
    scheduled_for: null,
    table_number: null,
    confirmed_at: null,
    preparing_at: null,
    ready_at: null,
    out_for_delivery_at: null,
    delivered_at: null,
    cancelled_at: null,
    items: [],
    ...over,
  };
}

describe("boardPrimaryAction", () => {
  it("only accepts a scheduled order due later than now + avg prep", () => {
    const later = order({ scheduled_for: "2026-10-05T22:00:00.000Z" });
    expect(boardPrimaryAction(later, "OWNER", CLOCK)).toEqual({ steps: ["CONFIRMED"], label: "Aceitar pedido", variant: "success" });
    const soon = order({ scheduled_for: "2026-10-04T23:10:00.000Z" }); // within the 30 min prep window
    expect(boardPrimaryAction(soon, "OWNER", CLOCK)?.steps).toEqual(["CONFIRMED", "PREPARING"]);
  });

  it("shows the scheduled date when it is not today", () => {
    expect(formatBoardSchedule("2026-10-04T23:30:00.000Z", TZ, NOW)).toBe("20:30");
    expect(formatBoardSchedule("2026-10-05T22:00:00.000Z", TZ, NOW)).toBe("05/10 · 19:00");
  });

  it("accepts and starts preparing a new order in one action", () => {
    expect(boardPrimaryAction(order(), "ATTENDANT", CLOCK)).toEqual({
      steps: ["CONFIRMED", "PREPARING"],
      label: "Aceitar e preparar",
      variant: "success",
    });
  });

  it("uses P2 copy for ready and conclude", () => {
    expect(boardPrimaryAction(order({ status: "PREPARING" }), "OWNER", CLOCK)).toMatchObject({
      steps: ["READY"],
      label: "Pronto para retirada",
      variant: "inverse",
    });
    expect(boardPrimaryAction(order({ status: "READY" }), "OWNER", CLOCK)).toMatchObject({
      steps: ["DELIVERED"],
      label: "Concluir",
      variant: "success",
    });
    expect(boardPrimaryAction(order({ status: "OUT_FOR_DELIVERY", type: "DELIVERY" }), "MANAGER", CLOCK)).toMatchObject({
      steps: ["DELIVERED"],
      label: "Concluir",
    });
  });

  it("sends delivery orders out instead of concluding them at READY", () => {
    expect(boardPrimaryAction(order({ status: "READY", type: "DELIVERY" }), "OWNER", CLOCK)).toMatchObject({
      steps: ["OUT_FOR_DELIVERY"],
    });
  });

  it("has nothing to offer on finished orders or for roles without the transition", () => {
    expect(boardPrimaryAction(order({ status: "DELIVERED" }), "OWNER", CLOCK)).toBeNull();
    expect(boardPrimaryAction(order({ status: "CANCELLED" }), "OWNER", CLOCK)).toBeNull();
    expect(boardPrimaryAction(order(), "KITCHEN", CLOCK)).toBeNull();
  });
});

describe("dropTargets / canCancel", () => {
  it("follows the transition table and the type rule", () => {
    expect(dropTargets(order({ status: "READY", type: "PICKUP" }), "ATTENDANT").sort()).toEqual(["CANCELLED", "DELIVERED"]);
    expect(dropTargets(order({ status: "READY", type: "DELIVERY" }), "ATTENDANT").sort()).toEqual([
      "CANCELLED",
      "OUT_FOR_DELIVERY",
    ]);
    expect(dropTargets(order({ status: "DELIVERED" }), "OWNER")).toEqual([]);
    expect(canCancel(order(), "ATTENDANT")).toBe(true);
    expect(canCancel(order({ status: "DELIVERED" }), "OWNER")).toBe(false);
  });
});

describe("filters", () => {
  it("counts P2 chips", () => {
    const list = [
      order({ status: "PENDING" }),
      order({ status: "PREPARING" }),
      order({ status: "READY" }),
      order({ status: "OUT_FOR_DELIVERY" }),
      order({ status: "DELIVERED" }),
      order({ status: "CANCELLED" }),
    ];
    expect(filterCounts(list)).toEqual({ all: 6, new: 1, preparing: 2, delivering: 1, done: 2 });
    expect(matchesFilter("CONFIRMED", "preparing")).toBe(true);
    expect(matchesFilter("CONFIRMED", "new")).toBe(false);
  });
});

describe("labels", () => {
  it("summarises items and types like P2", () => {
    expect(
      itemsSummary([
        { product_name: "Nhoque ao sugo", variant_name: null, quantity: 1 },
        { product_name: "Refrigerante", variant_name: null, quantity: 2 },
      ]),
    ).toBe("Nhoque ao sugo, Refrigerante ×2");
    expect(boardTypeLabel(order({ type: "DELIVERY" }))).toBe("Entrega");
    expect(boardTypeLabel(order({ type: "DINE_IN", table_number: 3 }))).toBe("Mesa 3");
  });
});

describe("time", () => {
  it("formats elapsed time", () => {
    expect(formatElapsed(20_000)).toBe("agora");
    expect(formatElapsed(12 * 60_000)).toBe("12 min");
    expect(formatElapsed(125 * 60_000)).toBe("2 h 05");
    expect(formatElapsed(3 * 24 * 60 * 60_000)).toBe("3 d");
  });

  it("badge suffix: arrival time when new, elapsed in status while open, finish time when done", () => {
    const now = Date.parse("2026-10-04T23:00:00.000Z");
    expect(badgeSuffix(order(), now, TZ)).toBe("19:42");
    expect(
      badgeSuffix(order({ status: "PREPARING", preparing_at: "2026-10-04T22:48:00.000Z" }), now, TZ),
    ).toBe("12 min");
    expect(badgeSuffix(order({ status: "DELIVERED", delivered_at: "2026-10-04T22:10:00.000Z" }), now, TZ)).toBe("19:10");
  });

  it("falls back to created_at when the status timestamp is missing", () => {
    expect(statusSince(order({ status: "READY" }))).toBe("2026-10-04T22:42:00.000Z");
  });

  it("finds midnight in the restaurant timezone", () => {
    expect(startOfDayInTimeZone(new Date("2026-10-05T01:30:00.000Z"), TZ).toISOString()).toBe("2026-10-04T03:00:00.000Z");
    expect(startOfDayInTimeZone(new Date("2026-10-04T12:00:00.000Z"), "UTC").toISOString()).toBe("2026-10-04T00:00:00.000Z");
  });
});

describe("merge / sort", () => {
  it("merges realtime rows without dropping items", () => {
    const card = order({ items: [{ product_name: "X", variant_name: null, quantity: 1 }] });
    const merged = mergeOrderRow(card, { status: "CONFIRMED", confirmed_at: "2026-10-04T22:50:00.000Z" });
    expect(merged.status).toBe("CONFIRMED");
    expect(merged.items).toHaveLength(1);
  });

  it("sorts newest first", () => {
    const a = order({ id: "a", created_at: "2026-10-04T10:00:00.000Z" });
    const b = order({ id: "b", created_at: "2026-10-04T11:00:00.000Z" });
    expect(sortBoardOrders([a, b]).map((o) => o.id)).toEqual(["b", "a"]);
  });
});
