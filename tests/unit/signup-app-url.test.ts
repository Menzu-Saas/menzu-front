import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const signUp = vi.fn();
const resetPasswordForEmail = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "atacante.example.com" }), cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect"); } }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { signUp, resetPasswordForEmail } }) }));

import { signUpAction } from "@/server/actions/auth";
import { publicAppUrl } from "@/lib/app-origin";

const form = () => {
  const data = new FormData();
  data.set("name", "Pessoa de Teste");
  data.set("email", "pessoa@example.com");
  data.set("password", "Teste-1234!");
  return data;
};

beforeEach(() => {
  signUp.mockReset().mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_URL", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("cadastro e o endereço público do site", () => {
  it("na Vercel sem APP_URL, usa o domínio de produção que a própria Vercel informa", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "menzu-front.vercel.app");
    await expect(signUpAction(form())).resolves.toMatchObject({ ok: true, status: "check_email" });
    expect(signUp.mock.calls[0]![0].options.emailRedirectTo).toMatch(/^https:\/\/menzu-front\.vercel\.app\/auth\/callback\?next=/);
  });

  it("APP_URL continua tendo prioridade", () => {
    expect(publicAppUrl({ APP_URL: "https://menzu.com.br", VERCEL: "1", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe("https://menzu.com.br");
  });

  it("nunca usa o endereço pedido pelo visitante: sem nenhuma fonte confiável, recusa antes de criar a conta", async () => {
    await expect(signUpAction(form())).rejects.toThrow(/APP_URL is not configured/);
    expect(signUp).not.toHaveBeenCalled();
  });

  it("fora da Vercel, ignora a variável da plataforma", () => {
    expect(publicAppUrl({ VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBeUndefined();
  });
});
