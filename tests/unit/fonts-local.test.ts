import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// O build não pode depender do Google Fonts: às vezes ele devolve um endereço sem extensão e o
// Next 16.3.8 quebra (https://github.com/vercel/next.js/issues/99114).
const root = path.resolve(__dirname, "../..");
const sources = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? sources(full) : /\.tsx?$/.test(entry.name) ? [full] : [];
});

describe("fontes do projeto", () => {
  it("nenhum arquivo baixa fontes do Google durante o build", () => {
    const offenders = sources(path.join(root, "src")).filter((file) => readFileSync(file, "utf8").includes("next/font/google"));
    expect(offenders).toEqual([]);
  });

  it("todos os arquivos de fonte declarados existem e são WOFF2", () => {
    const fonts = readFileSync(path.join(root, "src/app/fonts.ts"), "utf8");
    const files = [...fonts.matchAll(/"(\.\/font-files\/[^"]+)"/g)].map((match) => match[1]!);
    expect(files).toHaveLength(3);
    for (const file of files) expect(readFileSync(path.join(root, "src/app", file)).subarray(0, 4).toString()).toBe("wOF2");
  });
});
