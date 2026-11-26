import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { authDefaultPath, homeForRole, isProtectedPath } from "@/lib/role-home";
import { safeNextPath } from "@/lib/safe-next";
import { assignableRoles } from "@/lib/team";

describe("aplicativo exclusivo do restaurante", () => {
  it("mantém as entradas dentro do restaurante", () => {
    expect(authDefaultPath()).toBe("/acessar");
    expect(homeForRole("OWNER")).toBe("/painel");
    expect(homeForRole("KITCHEN")).toBe("/cozinha");
    expect(homeForRole("DELIVERY")).toBe("/sem-restaurante");
    expect(isProtectedPath("/painel/pedidos")).toBe(true);
    expect(isProtectedPath("/entregas")).toBe(true);
    expect(assignableRoles("OWNER")).not.toContain("DELIVERY");
    expect(assignableRoles("MANAGER")).not.toContain("DELIVERY");
  });

  it.each(["/cardapio/loja/checkout", "/entregador", "/pedidos", "/para-restaurantes", "//evil.test", "/\\evil.test", "/painel\n", "/painelx"])("recusa destino removido ou inseguro: %s", (value) => {
    expect(safeNextPath(value)).toBeNull();
  });

  it.each(["/painel/pedidos?status=PENDING", "/cozinha", "/convite/token", "/onboarding", "/acessar"])("preserva destino do restaurante: %s", (value) => {
    expect(safeNextPath(value)).toBe(value);
  });

  it("não inclui rotas ou imports dos aplicativos removidos", () => {
    const app = path.resolve("src/app");
    for (const folder of ["entregador", "para-restaurantes", "pedidos", "pedido", "admin"]) {
      expect(existsSync(path.join(app, folder))).toBe(false);
    }
    // The home is the restaurant landing page, which links to sign in and sign up.
    const home = readFileSync(path.join(app, "page.tsx"), "utf8");
    expect(home).toContain("ProductLanding");
    expect(home).toContain('loginHref="/acessar"');
    const files = readdirSync("src", { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile());
    for (const entry of files) {
      const content = readFileSync(path.join(entry.parentPath, entry.name), "utf8");
      expect(content).not.toMatch(/from\s+["'][^"']*apps\/(entregador|restaurante)/);
      expect(content).not.toContain("@/components/marketplace/storefront");
    }
  });
});
