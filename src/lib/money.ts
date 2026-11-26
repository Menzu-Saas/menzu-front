const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formats integer cents as pt-BR currency, e.g. 4690 -> "R$ 46,90". */
export function formatMoney(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, " ");
}

/** Parses user-typed money ("46,90", "R$ 1.234,5", "7") to integer cents. */
export function parseMoneyToCents(input: string): number {
  let s = input.replace(/[^\d.,]/g, "");
  if (!s) return 0;
  if (s.includes(",")) {
    // pt-BR: dots are thousands separators, comma is the decimal mark.
    s = s.replace(/\./g, "");
  } else if (/^\d+\.\d{1,2}$/.test(s)) {
    // "46.90" typed with a dot decimal.
    s = s.replace(".", ",");
  } else {
    s = s.replace(/\./g, "");
  }
  const [intPart = "", decPart = ""] = s.split(",");
  const reais = parseInt(intPart || "0", 10);
  const cents = parseInt(decPart.padEnd(2, "0").slice(0, 2) || "0", 10);
  return reais * 100 + cents;
}
