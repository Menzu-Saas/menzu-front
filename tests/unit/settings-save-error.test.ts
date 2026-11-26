import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }) }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect"); } }));
vi.mock("@/server/auth", () => ({ CURRENT_RESTAURANT_COOKIE: "r", requireMemberOf: async () => ({ ok: true, restaurantId: "00000000-0000-4000-8000-000000000001" }) }));

let failure: unknown = null;
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    rpc: async () => ({ data: true, error: null }),
    from: () => ({ update: () => ({ eq: () => ({ select: async () => ({ data: null, error: failure }) }) }) }),
  }),
}));

import { updateProfileAction } from "@/server/actions/settings";

const profile = { name: "Restaurante Exemplo", description: "", phone: "(81) 99999-9999", whatsapp: "", instagram: "", slug: "restaurante-exemplo", primary_color: "#1EBCCF" };
const save = () => updateProfileAction("00000000-0000-4000-8000-000000000001", profile);

beforeEach(() => { failure = null; vi.spyOn(console, "error").mockImplementation(() => {}); });

describe("erro ao salvar as configurações", () => {
  it("assinatura suspensa: mostra o motivo em vez de 'Tente novamente'", async () => {
    failure = { code: "P0001", message: "MENZU:SUBSCRIPTION_SUSPENDED", details: "Assinatura suspensa: o painel está em modo somente leitura. Regularize a assinatura para editar." };
    await expect(save()).resolves.toEqual({ ok: false, error: "Assinatura suspensa: o painel está em modo somente leitura. Regularize a assinatura para editar." });
  });

  it("erro desconhecido continua genérico, sem expor detalhes do banco, e fica registrado só com o código", async () => {
    failure = { code: "XX000", message: "internal: relation secreta", details: "linha com dados" };
    await expect(save()).resolves.toEqual({ ok: false, error: "Não foi possível salvar. Tente novamente." });
    expect(console.error).toHaveBeenCalledWith("[settings] falha ao salvar o restaurante", "XX000");
  });

  it("endereço repetido continua apontando o campo", async () => {
    failure = { code: "23505", message: "MENZU:SLUG_TAKEN" };
    await expect(save()).resolves.toEqual({ ok: false, fieldErrors: { slug: "Este endereço já está em uso." } });
  });
});
