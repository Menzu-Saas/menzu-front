import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CurrentRestaurantProvider } from "@/components/admin/current-restaurant";
import { ProfileForm } from "@/components/settings/profile-form";
import type { RestaurantSettings } from "@/server/queries/settings";

// As ações de servidor não rodam no jsdom; este teste cobre só a abertura do seletor.
vi.mock("@/server/actions/settings", () => ({ checkSlugAction: vi.fn(), updateProfileAction: vi.fn(), setRestaurantImageAction: vi.fn(), suggestSlugAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

const restaurant = {
  id: "00000000-0000-4000-8000-000000000000", slug: "restaurante-exemplo", name: "Restaurante Exemplo", description: "",
  phone: null, whatsapp: null, instagram: null, logo_url: null, banner_url: null, primary_color: "#12A150",
} as unknown as RestaurantSettings;

const setup = () => {
  render(<CurrentRestaurantProvider restaurantId={restaurant.id}><ProfileForm restaurant={restaurant} menuHost="exemplo.test" addressLine="" /></CurrentRestaurantProvider>);
  return userEvent.setup();
};
const picker = () => screen.queryByRole("group", { name: "Seletor RGB" });
const dot = () => screen.getByRole("button", { name: "Escolher outra cor (RGB)" });

describe("seletor RGB abre pela última bolinha", () => {
  it("começa fechado", () => {
    setup();
    expect(picker()).toBeNull();
    expect(dot().getAttribute("aria-expanded")).toBe("false");
  });

  it("clicar na bolinha abre; clicar de novo fecha; não envia o formulário", async () => {
    const user = setup();
    await user.click(dot());
    expect(picker()).not.toBeNull();
    expect(dot().getAttribute("aria-expanded")).toBe("true");
    expect(dot().getAttribute("aria-controls")).toBe(picker()!.parentElement!.id);
    expect(dot().getAttribute("type")).toBe("button");
    await user.click(dot());
    expect(picker()).toBeNull();
  });

  it("Esc fecha e devolve o foco à bolinha", async () => {
    const user = setup();
    await user.click(dot());
    screen.getByRole("slider", { name: "Vermelho (R)" }).focus();
    await user.keyboard("{Escape}");
    expect(picker()).toBeNull();
    expect(document.activeElement).toBe(dot());
  });

  it("é a última bolinha: vem depois de todas as cores prontas", () => {
    setup();
    const swatch = screen.getByRole("button", { name: "Grafite" });
    expect(swatch.compareDocumentPosition(dot()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
