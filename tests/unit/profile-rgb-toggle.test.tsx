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
const picker = () => screen.queryByRole("group", { name: "Seletor de cores" });
const dot = () => screen.getByRole("button", { name: "Mais cores" });

describe("seletor de cores abre pela última bolinha", () => {
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
    screen.getByRole("slider", { name: "Matiz" }).focus();
    await user.keyboard("{Escape}");
    expect(picker()).toBeNull();
    expect(document.activeElement).toBe(dot());
  });

  it("é a última bolinha: vem depois de todas as cores prontas", () => {
    setup();
    const swatch = screen.getByRole("button", { name: "Grafite" });
    expect(swatch.compareDocumentPosition(dot()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("escolher no seletor muda a cor do formulário; a bolinha passa a mostrá-la e Padrão a limpa", async () => {
    const user = setup();
    await user.click(dot());
    const hex = screen.getByRole("textbox", { name: "Código HEX" });
    await user.clear(hex);
    await user.type(hex, "8E24AA");
    expect(dot().style.backgroundColor).toBe("rgb(142, 36, 170)");
    expect((screen.getByRole("button", { name: "Salvar alterações" }) as HTMLButtonElement).disabled).toBe(false);
    await user.click(screen.getByRole("button", { name: "Padrão" }));
    expect(dot().style.backgroundColor).toBe("");
  });
});
