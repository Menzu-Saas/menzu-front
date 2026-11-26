import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const rpc = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error("redirect:" + url); }, notFound: () => { throw new Error("notFound"); } }));

import { slugCandidates } from "@/lib/slug";
import { redirectOldSlug } from "@/server/queries/old-slug";

beforeEach(() => rpc.mockReset());

describe("endereço acompanha o nome", () => {
  it("gera o endereço do nome e variações numeradas", () => {
    expect(slugCandidates("Cantina da Ana").slice(0, 3)).toEqual(["cantina-da-ana", "cantina-da-ana-2", "cantina-da-ana-3"]);
  });

  it("respeita o limite de 50 caracteres nas variações, sem hífen duplicado", () => {
    for (const slug of slugCandidates("a".repeat(47) + " bb cc")) {
      expect(slug.length).toBeLessThanOrEqual(50);
      expect(slug).toMatch(/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/);
      expect(slug).not.toContain("--");
    }
  });

  it("nome sem letras suficientes não gera endereço", () => {
    expect(slugCandidates("É!")).toEqual([]);
  });
});

describe("endereço antigo", () => {
  it("leva ao novo mantendo a página e o número da mesa", async () => {
    rpc.mockResolvedValue({ data: "nome-novo", error: null });
    await expect(redirectOldSlug("nome-antigo", "/checkout", { table: "4", x: ["a", "b"] })).rejects.toThrow("redirect:/cardapio/nome-novo/checkout?table=4&x=a&x=b");
    expect(rpc).toHaveBeenCalledWith("resolve_old_slug", { p_slug: "nome-antigo" });
  });

  it("sem histórico, ou se o banco falhar, mostra página não encontrada", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(redirectOldSlug("nunca-existiu")).rejects.toThrow("notFound");
    rpc.mockResolvedValue({ data: null, error: { message: "function does not exist" } });
    await expect(redirectOldSlug("nunca-existiu")).rejects.toThrow("notFound");
  });

  it("nunca redireciona para um valor que não seja um endereço válido", async () => {
    rpc.mockResolvedValue({ data: "//site-externo.com", error: null });
    await expect(redirectOldSlug("nome-antigo")).rejects.toThrow("notFound");
  });
});
