import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPage } from "@/components/landing/landing-page";

const setup = () => render(<LandingPage loginHref="/acessar" signupHref="/cadastro" exampleHref="/cardapio/burger-house" />);
const linksTo = (href: string) => screen.getAllByRole("link").filter((link) => link.getAttribute("href") === href);

describe("landing", () => {
  it("tem um único título principal", () => {
    setup();
    const titles = screen.getAllByRole("heading", { level: 1 });
    expect(titles).toHaveLength(1);
    expect(titles[0]).toHaveTextContent("Seu restaurante pronto para o próximo pedido.");
  });

  it("leva a criar conta, entrar e ver o cardápio de exemplo", () => {
    setup();
    expect(screen.getAllByRole("link", { name: /Criar meu restaurante/ })[0]).toHaveAttribute("href", "/cadastro");
    expect(screen.getAllByRole("link", { name: "Entrar" })[0]).toHaveAttribute("href", "/acessar");
    expect(screen.getAllByRole("link", { name: /Ver um cardápio de exemplo/ })[0]).toHaveAttribute("href", "/cardapio/burger-house");
  });

  it("o cabeçalho aponta para as seções da própria página", () => {
    setup();
    const nav = screen.getByRole("navigation", { name: "Seções" });
    for (const id of ["recursos", "como-funciona", "duvidas"]) {
      expect(within(nav).getAllByRole("link").some((link) => link.getAttribute("href") === `#${id}`)).toBe(true);
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("o rodapé tem termos e privacidade", () => {
    setup();
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos");
    expect(within(footer).getByRole("link", { name: "Privacidade" })).toHaveAttribute("href", "/privacidade");
  });

  it("avisa que as telas são ilustrativas e não usa prints antigos", () => {
    const { container } = setup();
    expect(screen.getAllByText("Telas ilustrativas").length).toBeGreaterThan(0);
    expect(container.innerHTML).not.toContain("product-captures");
    expect(container.textContent).not.toContain("Buguer House");
    expect(linksTo("#recursos").length).toBeGreaterThan(0);
  });
});
