// CSV for Excel pt-BR: ";" separator (comma is the decimal mark), CRLF lines and a UTF-8 BOM so
// accents open correctly. Pure, so it can be unit-tested and used by route handlers.

export const CSV_SEPARATOR = ";";
export const CSV_BOM = "﻿";

export type CsvValue = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvValue;
}

/** Characters that make spreadsheet apps evaluate a cell as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;
/** Negative decimals ("-12,50") are data, not formulas. */
const PLAIN_NUMBER = /^-\d+(?:[.,]\d+)?$/;

/** One escaped cell: quoted when it holds ";", quotes or line breaks; formula-like text is neutralised. */
export function csvCell(value: CsvValue): string {
  if (value == null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = typeof value === "boolean" ? (value ? "Sim" : "Não") : value;
  if (FORMULA_START.test(text) && !PLAIN_NUMBER.test(text)) text = `'${text}`;
  if (/[";\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Header + rows joined with CRLF, prefixed with a BOM. */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(CSV_SEPARATOR)];
  for (const row of rows) lines.push(columns.map((c) => csvCell(c.value(row))).join(CSV_SEPARATOR));
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}

/** Cents as a pt-BR decimal without currency symbol, e.g. 4690 → "46,90" (Excel reads it as a number). */
export function centsToCsv(cents: number | null | undefined): string {
  if (cents == null) return "";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}
