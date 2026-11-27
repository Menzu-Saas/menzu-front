import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BRAND_SWATCHES } from "@/lib/schemas/settings";
import { MenuColorDemo } from "@/components/landing/demos/menu-color-demo";
import { OrderFlowDemo } from "@/components/landing/demos/order-flow-demo";
import { OrderStatusDemo } from "@/components/landing/demos/order-status-demo";
import { CheckoutDemo } from "@/components/landing/demos/checkout-demo";
import { RouteDemo } from "@/components/landing/demos/route-demo";
import { KitchenBoardDemo } from "@/components/landing/demos/kitchen-board-demo";
import { Customer } from "@/components/landing/sections/customer";

afterEach(() => vi.unstubAllGlobals());

function reducedMotion() {
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} unobserve() {} });
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }));
}
const root = (container: HTMLElement) => container.querySelector("[data-demo]") as HTMLElement;

describe("demonstração de cor do cardápio", () => {
  it("tem uma bolinha por cor pronta do painel, com nome acessível", () => {
    render(<MenuColorDemo />);
    for (const swatch of BRAND_SWATCHES) expect(screen.getByRole("button", { name: swatch.label })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: BRAND_SWATCHES[0].label })).toHaveAttribute("aria-pressed", "true");
  });

  it("clicar numa cor pinta o cartão e marca só ela", async () => {
    const user = userEvent.setup();
    const { container } = render(<MenuColorDemo />);
    await user.click(screen.getByRole("button", { name: "Verde" }));
    expect(screen.getByRole("button", { name: "Verde" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
    expect(root(container).style.getPropertyValue("--demo-accent")).toBe("#12A150");
  });

  it("funciona só com teclado", async () => {
    const user = userEvent.setup();
    render(<MenuColorDemo />);
    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: BRAND_SWATCHES[1].label })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("demonstrações animadas", () => {
  it("pedido do hero: com movimento reduzido o pedido #0142 já está na coluna Novos", () => {
    reducedMotion();
    const { container } = render(<OrderFlowDemo />);
    expect(root(container).dataset.step).toBe("3");
    expect(screen.getByText("#0142").closest("[data-arrived]")).toHaveAttribute("data-arrived", "true");
  });

  it("sem IntersectionObserver as demonstrações mostram o estado final", () => {
    for (const [Demo, last] of [[OrderStatusDemo, "2"], [CheckoutDemo, "3"], [RouteDemo, "3"]] as const) {
      const { container, unmount } = render(<Demo />);
      expect(root(container).dataset.step).toBe(last);
      unmount();
    }
  });

  it("o visual é decorativo para leitores de tela", () => {
    for (const Demo of [OrderFlowDemo, OrderStatusDemo, CheckoutDemo, RouteDemo]) {
      const { container, unmount } = render(<Demo />);
      expect(root(container)).toHaveAttribute("aria-hidden", "true");
      unmount();
    }
  });
});

describe("cozinha e telas do cliente", () => {
  it("quadro da cozinha: com movimento reduzido os 3 pedidos estão em Prontos e o próximo chegou", () => {
    reducedMotion();
    const { container } = render(<KitchenBoardDemo />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    const cards = [...container.querySelectorAll("[data-ticket]")] as HTMLElement[];
    expect(cards.slice(0, 3).every((card) => card.dataset.column === "prontos")).toBe(true);
    expect(cards[3]).toHaveAttribute("data-ticket", "#0146");
    expect(cards[3]).toHaveAttribute("data-column", "preparar");
    expect(cards[3]).toHaveAttribute("data-visible", "true");
  });

  it("telas do cliente: 4 celulares com legenda, numa lista com nome", () => {
    render(<Customer />);
    const list = screen.getByRole("list", { name: "Telas do cliente" });
    const items = list.querySelectorAll(":scope > li");
    expect(items).toHaveLength(4);
    for (const caption of ["Cardápio", "Sacola", "Checkout", "Acompanhe"]) expect(screen.getByRole("heading", { level: 3, name: caption })).toBeInTheDocument();
  });
});
