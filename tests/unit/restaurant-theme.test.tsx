import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const getPublicRestaurant = vi.fn();
vi.mock("@/server/queries/public-menu", () => ({ getPublicRestaurant: (slug: string) => getPublicRestaurant(slug) }));

import CardapioLayout from "@/app/cardapio/[slug]/layout";
import { contrastWithWhite, readableBrand, restaurantThemeCss } from "@/lib/restaurant-theme";

const value = (css: string, name: string) => css.match(new RegExp(`${name}:([^;}]+)`))?.[1];

describe("tema do cardápio pela cor do restaurante", () => {
  it("sem cor escolhida (Padrão) ou com valor inválido, mantém o laranja do Menzu", () => {
    for (const bad of [null, undefined, "", "#FFF", "red", "#123456;} body{display:none", "</style><script>x</script>"]) {
      expect(restaurantThemeCss(bad)).toBeNull();
    }
  });

  it("troca todas as variáveis de marca usadas por botões, ícones, quadros e listras", () => {
    const css = restaurantThemeCss("#2563eb")!;
    expect(css.startsWith(":root:root{")).toBe(true);
    expect(value(css, "--mz-brand")).toBe("#2563EB");
    expect(value(css, "--mz-accent")).toBe("#2563EB");
    for (const name of ["--mz-text-on-brand", "--mz-brand-gradient-from", "--mz-brand-hero-from", "--mz-brand-soft", "--mz-brand-soft-border", "--mz-brand-tint", "--mz-brand-tint-border", "--mz-brand-dashed", "--mz-brand-badge", "--mz-stripe-food-a", "--mz-stripe-food-b", "--mz-stripe-food-ink", "--mz-stripe-cover-a", "--mz-stripe-cover-b", "--mz-stripe-cover-ink"]) {
      expect(value(css, name), name).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(value(css, "--mz-shadow-cta")).toBe("0 10px 22px -12px rgba(37,99,235,0.9)");
    // Fundo suave bem claro: o texto na cor do restaurante continua legível sobre ele.
    expect(contrastWithWhite(value(css, "--mz-brand-soft")!)).toBeLessThan(1.2);
  });

  it("cor escura ou média fica exatamente como foi escolhida", () => {
    for (const hex of ["#2563EB", "#8E24AA", "#1A1614", "#C2410C"]) expect(readableBrand(hex)).toBe(hex);
  });

  it("cor clara é escurecida só o necessário para o texto branco continuar legível", () => {
    for (const hex of ["#FFE100", "#1EBCCF", "#FFFFFF", "#FF8A3D"]) {
      const safe = readableBrand(hex);
      expect(contrastWithWhite(safe), hex).toBeGreaterThanOrEqual(3.5);
      expect(contrastWithWhite(safe), hex).toBeLessThan(4.2);
    }
  });

  it("o layout do cardápio aplica o tema do restaurante da página", async () => {
    getPublicRestaurant.mockResolvedValueOnce({ primaryColor: "#8E24AA" });
    const html = renderToStaticMarkup(await CardapioLayout({ params: Promise.resolve({ slug: "papa-s" }), children: <p>cardápio</p> }));
    expect(getPublicRestaurant).toHaveBeenLastCalledWith("papa-s");
    expect(html).toContain("--mz-brand:#8E24AA");
    expect(html).toContain("<p>cardápio</p>");
  });

  it("falha ao buscar o restaurante ou endereço antigo: a página segue, sem tema", async () => {
    for (const result of [() => Promise.reject(new Error("db")), () => Promise.resolve(null)]) {
      getPublicRestaurant.mockImplementationOnce(result);
      const html = renderToStaticMarkup(await CardapioLayout({ params: Promise.resolve({ slug: "x" }), children: <p>ok</p> }));
      expect(html).toBe("<p>ok</p>");
    }
  });
});
