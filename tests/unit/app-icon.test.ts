import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("ícone da aba", () => {
  it("o app declara um ícone, igual ao logo do Menzu", () => {
    const icon = path.join(root, "src/app/icon.svg");
    expect(existsSync(icon)).toBe(true);
    expect(readFileSync(icon, "utf8")).toBe(readFileSync(path.join(root, "public/menzu-logo.svg"), "utf8"));
  });
});
