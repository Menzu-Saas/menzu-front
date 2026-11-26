import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import nextConfig from "../../next.config";
import { apiOrigin, missingDeployVariables } from "@/lib/split-deploy";
import { guestOrderingAvailable } from "@/server/guest-ordering";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("front separado da API", () => {
  it("aceita só o endereço https da API", () => {
    expect(apiOrigin({})).toBeNull();
    expect(apiOrigin({ MENZU_API_ORIGIN: "https://menzu-api.onrender.com/" })).toBe("https://menzu-api.onrender.com");
    expect(apiOrigin({ MENZU_API_ORIGIN: "http://localhost:3004" })).toBe("http://localhost:3004");
    for (const bad of ["http://api.example.com", "https://api.example.com/api", "https://u:p@api.example.com", "api"]) {
      expect(() => apiOrigin({ MENZU_API_ORIGIN: bad })).toThrow();
    }
  });

  it("lista as variáveis que faltam no deploy", () => {
    expect(missingDeployVariables({ MENZU_API_ORIGIN: "https://api.example.com" })).toEqual(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
  });

  it("repassa /api/* para a API; sem a variável não repassa nada", async () => {
    vi.stubEnv("MENZU_API_ORIGIN", "https://api.example.com");
    expect(await nextConfig.rewrites!()).toMatchObject({ beforeFiles: [{ source: "/api/:path*", destination: "https://api.example.com/api/:path*" }] });
    vi.stubEnv("MENZU_API_ORIGIN", "");
    expect(await nextConfig.rewrites!()).toMatchObject({ beforeFiles: [] });
  });

  it("pergunta à API se os pedidos estão abertos e fecha em qualquer falha", async () => {
    vi.stubEnv("MENZU_API_ORIGIN", "https://api.example.com");
    const fetchMock = vi.fn(async () => Response.json({ ok: true, ordering: true }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await guestOrderingAvailable()).toBe(true);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("https://api.example.com/api/health");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await guestOrderingAvailable()).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, ordering: false })));
    expect(await guestOrderingAvailable()).toBe(false);
  });
});
