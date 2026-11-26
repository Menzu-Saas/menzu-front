import { describe, it, expect } from "vitest";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
describe("money", () => {
  it("formats cents in pt-BR", () => {
    expect(formatMoney(4690)).toBe("R$ 46,90");
    expect(formatMoney(123450)).toBe("R$ 1.234,50");
    expect(formatMoney(0)).toBe("R$ 0,00");
  });
  it("parses user input to cents", () => {
    expect(parseMoneyToCents("46,90")).toBe(4690);
    expect(parseMoneyToCents("R$ 1.234,5")).toBe(123450);
    expect(parseMoneyToCents("7")).toBe(700);
    expect(parseMoneyToCents("")).toBe(0);
  });
});
