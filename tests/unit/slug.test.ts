import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and strips accents", () => {
    expect(slugify("Pizzaria São João")).toBe("pizzaria-sao-joao");
    expect(slugify("AÇAÍ & Cia")).toBe("acai-cia");
  });

  it("collapses non-alphanumerics into single hyphens and trims them", () => {
    expect(slugify("  --Burger   House!!  ")).toBe("burger-house");
    expect(slugify("Bar_do_Zé / 24h")).toBe("bar-do-ze-24h");
  });

  it("caps at 50 chars without a trailing hyphen", () => {
    const slug = slugify("a".repeat(49) + " bcd");
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug).toBe("a".repeat(49));
  });

  it("returns empty for input without letters or digits", () => {
    expect(slugify("!!! ---")).toBe("");
    expect(slugify("")).toBe("");
  });
});
