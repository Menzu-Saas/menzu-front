import { describe, expect, it } from "vitest";
import { ADMIN_NAV, canSeeDashboard, navItemsFor, operationNavFor } from "@/components/admin/nav-items";
import { activeHourWindow } from "@/components/dashboard/sales-chart";

describe("admin nav", () => {
  it("lists every admin route for owners and managers", () => {
    const hrefs = navItemsFor("OWNER").map((i) => i.href);
    expect(hrefs).toEqual(ADMIN_NAV.map((e) => e.href));
    expect(hrefs).toHaveLength(13);
    // Wallet and plan deal with money: owners only.
    expect(navItemsFor("MANAGER").map((i) => i.href)).toEqual(hrefs.filter((href) => href !== "/painel/carteira" && href !== "/painel/plano"));
  });

  it("limits attendants to orders and customers", () => {
    expect(navItemsFor("ATTENDANT").map((i) => i.href)).toEqual(["/painel/pedidos", "/painel/clientes"]);
    expect(canSeeDashboard("ATTENDANT")).toBe(false);
    expect(canSeeDashboard("MANAGER")).toBe(true);
  });

  it("shows nothing to kitchen and delivery roles", () => {
    expect(navItemsFor("KITCHEN")).toEqual([]);
    expect(navItemsFor("DELIVERY")).toEqual([]);
  });

  it("links owners, managers and attendants to the kitchen and delivery screens", () => {
    for (const role of ["OWNER", "MANAGER", "ATTENDANT"] as const) {
      expect(operationNavFor(role).map((i) => i.href)).toEqual(["/cozinha", "/entregas"]);
    }
    expect(operationNavFor("KITCHEN")).toEqual([]);
  });

  it("puts the pending counter on Pedidos only", () => {
    const items = navItemsFor("OWNER", { orders: 3 });
    expect(items.find((i) => i.href === "/painel/pedidos")?.badge).toBe(3);
    expect(items.filter((i) => i.badge).length).toBe(1);
  });
});

describe("activeHourWindow", () => {
  const hours = (active: Record<number, number>) =>
    Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, revenue_cents: active[h] ?? 0, orders: 0 }));

  it("is empty without sales", () => {
    expect(activeHourWindow(hours({}))).toEqual([]);
  });

  it("covers the busy hours and pads to six", () => {
    expect(activeHourWindow(hours({ 22: 100 })).map((b) => b.label)).toEqual(["18h", "19h", "20h", "21h", "22h", "23h"]);
    expect(activeHourWindow(hours({ 11: 1, 21: 2 })).map((b) => b.label)).toHaveLength(11);
    expect(activeHourWindow(hours({ 0: 5 })).map((b) => b.label)).toEqual(["0h", "1h", "2h", "3h", "4h", "5h"]);
  });
});
