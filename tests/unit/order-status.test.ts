import { describe, it, expect } from "vitest";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUSES,
  allowedTransitions,
  canTransition,
  nextPrimaryAction,
} from "@/lib/order-status";
import { parseMenzuError } from "@/lib/order-errors";
import transitions from "@/lib/order-transitions.json";

describe("order status machine", () => {
  it("KITCHEN can move CONFIRMED→PREPARING and PREPARING→READY but not PENDING→CONFIRMED", () => {
    expect(canTransition("CONFIRMED", "PREPARING", "KITCHEN", "DELIVERY")).toBe(true);
    expect(canTransition("PREPARING", "READY", "KITCHEN", "PICKUP")).toBe(true);
    expect(canTransition("PENDING", "CONFIRMED", "KITCHEN", "DELIVERY")).toBe(false);
    expect(canTransition("PREPARING", "CANCELLED", "KITCHEN", "DELIVERY")).toBe(false);
  });

  it("DELIVERY can move READY→OUT_FOR_DELIVERY only for DELIVERY orders", () => {
    expect(canTransition("READY", "OUT_FOR_DELIVERY", "DELIVERY", "DELIVERY")).toBe(true);
    expect(canTransition("READY", "OUT_FOR_DELIVERY", "DELIVERY", "PICKUP")).toBe(false);
    expect(canTransition("READY", "OUT_FOR_DELIVERY", "DELIVERY", "DINE_IN")).toBe(false);
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY", "DELIVERY")).toBe(true);
    expect(canTransition("CONFIRMED", "PREPARING", "DELIVERY", "DELIVERY")).toBe(false);
  });

  it("PICKUP: ATTENDANT may go READY→DELIVERED, not READY→OUT_FOR_DELIVERY", () => {
    expect(canTransition("READY", "DELIVERED", "ATTENDANT", "PICKUP")).toBe(true);
    expect(canTransition("READY", "OUT_FOR_DELIVERY", "ATTENDANT", "PICKUP")).toBe(false);
    expect(allowedTransitions("READY", "ATTENDANT", "PICKUP")).toEqual(["DELIVERED", "CANCELLED"]);
  });

  it("DELIVERY-type orders cannot skip OUT_FOR_DELIVERY", () => {
    expect(canTransition("READY", "DELIVERED", "OWNER", "DELIVERY")).toBe(false);
    expect(allowedTransitions("READY", "OWNER", "DELIVERY")).toEqual(["OUT_FOR_DELIVERY", "CANCELLED"]);
  });

  it("nobody transitions from final states", () => {
    for (const role of ["OWNER", "MANAGER", "ATTENDANT", "KITCHEN", "DELIVERY"] as const) {
      for (const type of ["DELIVERY", "PICKUP", "DINE_IN"] as const) {
        expect(allowedTransitions("DELIVERED", role, type)).toEqual([]);
        expect(allowedTransitions("CANCELLED", role, type)).toEqual([]);
      }
    }
  });

  it("transition table covers every status and has labels", () => {
    expect(Object.keys(transitions).sort()).toEqual([...ORDER_STATUSES].sort());
    for (const s of ORDER_STATUSES) expect(ORDER_STATUS_LABEL[s]).toBeTruthy();
  });

  it("nextPrimaryAction", () => {
    expect(nextPrimaryAction({ status: "PENDING", type: "DELIVERY" }, "ATTENDANT")).toEqual({
      to: "CONFIRMED",
      label: "Aceitar pedido",
    });
    expect(nextPrimaryAction({ status: "PENDING", type: "DELIVERY" }, "KITCHEN")).toBeNull();
    expect(nextPrimaryAction({ status: "CONFIRMED", type: "PICKUP" }, "KITCHEN")).toEqual({
      to: "PREPARING",
      label: "Iniciar preparo",
    });
    expect(nextPrimaryAction({ status: "PREPARING", type: "PICKUP" }, "KITCHEN")).toEqual({
      to: "READY",
      label: "Marcar como pronto",
    });
    expect(nextPrimaryAction({ status: "READY", type: "DELIVERY" }, "DELIVERY")).toEqual({
      to: "OUT_FOR_DELIVERY",
      label: "Saiu para entrega",
    });
    expect(nextPrimaryAction({ status: "OUT_FOR_DELIVERY", type: "DELIVERY" }, "DELIVERY")).toEqual({
      to: "DELIVERED",
      label: "Marcar entregue",
    });
    expect(nextPrimaryAction({ status: "READY", type: "DINE_IN" }, "MANAGER")).toEqual({
      to: "DELIVERED",
      label: "Concluir",
    });
    expect(nextPrimaryAction({ status: "DELIVERED", type: "DINE_IN" }, "OWNER")).toBeNull();
  });
});

describe("parseMenzuError", () => {
  it("extracts code and detail from a PostgrestError-like object", () => {
    expect(parseMenzuError({ message: "MENZU:BELOW_MINIMUM", details: "Pedido mínimo R$ 20,00" })).toEqual({
      code: "BELOW_MINIMUM",
      message: "Pedido mínimo R$ 20,00",
    });
  });

  it("falls back to the code map when details are missing", () => {
    const r = parseMenzuError({ message: "MENZU:OUT_OF_DELIVERY_AREA" });
    expect(r.code).toBe("OUT_OF_DELIVERY_AREA");
    expect(r.message).toMatch(/entrega/i);
  });

  it("handles Error instances and unknown values", () => {
    expect(parseMenzuError(new Error("MENZU:COUPON_INVALID")).code).toBe("COUPON_INVALID");
    const u = parseMenzuError("boom");
    expect(u.code).toBe("UNKNOWN");
    expect(u.message).toBeTruthy();
    expect(parseMenzuError(null).code).toBe("UNKNOWN");
  });
});
