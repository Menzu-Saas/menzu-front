import { describe, expect, it } from "vitest";
import { centsToCsv, CSV_BOM, csvCell, toCsv } from "@/lib/csv";

describe("csvCell", () => {
  it("leaves plain values untouched", () => {
    expect(csvCell("Maria Souza")).toBe("Maria Souza");
    expect(csvCell(1045)).toBe("1045");
    expect(csvCell("46,90")).toBe("46,90");
  });

  it("renders empty, boolean and non-finite values", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(Number.NaN)).toBe("");
    expect(csvCell(true)).toBe("Sim");
    expect(csvCell(false)).toBe("Não");
  });

  it("quotes separators, quotes and line breaks", () => {
    expect(csvCell("Rua A; 10")).toBe('"Rua A; 10"');
    expect(csvCell('X-Burger "duplo"')).toBe('"X-Burger ""duplo"""');
    expect(csvCell("sem cebola\nbem passado")).toBe('"sem cebola\nbem passado"');
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"');
  });

  it("neutralises formula injection but keeps negative numbers", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+5511999")).toBe("'+5511999");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("-cmd")).toBe("'-cmd");
    expect(csvCell("-12,50")).toBe("-12,50");
  });
});

describe("toCsv", () => {
  const columns = [
    { header: "Pedido", value: (r: { n: number; name: string }) => r.n },
    { header: "Cliente", value: (r: { n: number; name: string }) => r.name },
  ];

  it("starts with a BOM, uses ; and CRLF", () => {
    const csv = toCsv([{ n: 1001, name: "Ana" }, { n: 1002, name: "João; Silva" }], columns);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv.slice(1)).toBe('Pedido;Cliente\r\n1001;Ana\r\n1002;"João; Silva"\r\n');
  });

  it("outputs only the header for no rows", () => {
    expect(toCsv([], columns)).toBe(`${CSV_BOM}Pedido;Cliente\r\n`);
  });
});

describe("centsToCsv", () => {
  it("formats cents with a decimal comma", () => {
    expect(centsToCsv(4690)).toBe("46,90");
    expect(centsToCsv(5)).toBe("0,05");
    expect(centsToCsv(123456)).toBe("1234,56");
    expect(centsToCsv(0)).toBe("0,00");
    expect(centsToCsv(-700)).toBe("-7,00");
    expect(centsToCsv(null)).toBe("");
  });
});
