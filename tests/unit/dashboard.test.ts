import { describe, expect, it } from "vitest";
import {
  countDelta,
  firstName,
  formatDayLine,
  formatMoneyShort,
  greetingFor,
  minutesDelta,
  parsePeriod,
  percentDelta,
  periodRange,
  storeHoursInfo,
  zonedMidnight,
} from "@/lib/dashboard";

const TZ = "America/Sao_Paulo";

describe("periods in the restaurant timezone", () => {
  it("finds local midnight (São Paulo is UTC-3)", () => {
    expect(zonedMidnight(2026, 9, 9, TZ).toISOString()).toBe("2026-09-09T03:00:00.000Z");
    expect(zonedMidnight(2026, 10, 0, TZ).toISOString()).toBe("2026-09-30T03:00:00.000Z");
  });

  it("today runs midnight→midnight and compares with yesterday until the same time", () => {
    // 2026-09-09 20:30 local
    const now = new Date("2026-09-09T23:30:00.000Z");
    const r = periodRange("hoje", now, TZ);
    expect(r.from.toISOString()).toBe("2026-09-09T03:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-09-10T03:00:00.000Z");
    expect(r.prevFrom.toISOString()).toBe("2026-09-08T03:00:00.000Z");
    expect(r.prevTo.toISOString()).toBe("2026-09-08T23:30:00.000Z");
  });

  it("7 days includes today and the six days before", () => {
    const now = new Date("2026-09-09T23:30:00.000Z");
    const r = periodRange("7d", now, TZ);
    expect(r.from.toISOString()).toBe("2026-09-03T03:00:00.000Z");
    expect(r.prevFrom.toISOString()).toBe("2026-08-27T03:00:00.000Z");
  });

  it("uses the local date even when UTC is already tomorrow", () => {
    // 2026-09-09 22:00 local = 2026-09-10 01:00 UTC
    const r = periodRange("hoje", new Date("2026-09-10T01:00:00.000Z"), TZ);
    expect(r.from.toISOString()).toBe("2026-09-09T03:00:00.000Z");
  });

  it("parses the period param with a safe default", () => {
    expect(parsePeriod("7d")).toBe("7d");
    expect(parsePeriod(["30d"])).toBe("30d");
    expect(parsePeriod("hoje")).toBe("hoje");
    expect(parsePeriod("x")).toBe("7d");
    expect(parsePeriod(undefined)).toBe("7d");
  });
});

describe("greeting and date line", () => {
  it("greets by hour", () => {
    expect(greetingFor(8)).toBe("Bom dia");
    expect(greetingFor(14)).toBe("Boa tarde");
    expect(greetingFor(21)).toBe("Boa noite");
    expect(greetingFor(2)).toBe("Boa noite");
  });

  it("formats the day line like the reference", () => {
    expect(formatDayLine(new Date("2026-09-09T15:00:00.000Z"), TZ)).toBe("Quarta, 9 de setembro");
  });

  it("extracts the first name", () => {
    expect(firstName("Marina Souza")).toBe("Marina");
    expect(firstName(null, "dono@burgerhouse.test")).toBe("Dono");
    expect(firstName("  ", null)).toBe("");
  });
});

describe("deltas and money", () => {
  it("formats whole reais", () => {
    expect(formatMoneyShort(412800)).toBe("R$ 4.128");
    expect(formatMoneyShort(43549)).toBe("R$ 435");
  });

  it("computes percent deltas", () => {
    expect(percentDelta(118, 100, "vs ontem")).toEqual({ text: "+18% vs ontem", tone: "up" });
    expect(percentDelta(80, 100, "vs ontem")).toEqual({ text: "−20% vs ontem", tone: "down" });
    expect(percentDelta(100, 100, "vs ontem")).toEqual({ text: "estável", tone: "neutral" });
    expect(percentDelta(10, 0, "vs ontem").tone).toBe("neutral");
  });

  it("computes count and minute deltas", () => {
    expect(countDelta(96, 85, "vs ontem")).toEqual({ text: "+11 vs ontem", tone: "up" });
    expect(minutesDelta(38, 35)).toEqual({ text: "+3 min", tone: "warn" });
    expect(minutesDelta(30, 35)).toEqual({ text: "−5 min", tone: "up" });
    expect(minutesDelta(0, 35).tone).toBe("neutral");
  });
});

describe("storeHoursInfo", () => {
  const week = (opens: string, closes: string) =>
    Array.from({ length: 7 }, (_, weekday) => ({ weekday, opens_at: opens, closes_at: closes }));

  it("inside hours shows the closing time", () => {
    // 20:30 local
    const info = storeHoursInfo(week("11:00:00", "23:00:00"), new Date("2026-09-09T23:30:00.000Z"), TZ);
    expect(info).toEqual({ withinHours: true, detail: "Fecha às 23:00" });
  });

  it("before opening shows today's opening time", () => {
    // 09:00 local
    const info = storeHoursInfo(week("11:00:00", "23:00:00"), new Date("2026-09-09T12:00:00.000Z"), TZ);
    expect(info).toEqual({ withinHours: false, detail: "Abre às 11:00" });
  });

  it("after closing shows tomorrow", () => {
    // 23:30 local
    const info = storeHoursInfo(week("11:00:00", "23:00:00"), new Date("2026-09-10T02:30:00.000Z"), TZ);
    expect(info).toEqual({ withinHours: false, detail: "Abre amanhã às 11:00" });
  });

  it("handles windows that cross midnight", () => {
    // 01:00 local on Thursday, Wednesday window 18:00→02:00
    const hours = [{ weekday: 3, opens_at: "18:00:00", closes_at: "02:00:00" }];
    const info = storeHoursInfo(hours, new Date("2026-09-10T04:00:00.000Z"), TZ);
    expect(info).toEqual({ withinHours: true, detail: "Fecha às 02:00" });
  });

  it("all-day windows and missing hours", () => {
    expect(storeHoursInfo(week("00:00:00", "23:59:59"), new Date(), TZ).detail).toBe("Aberta 24 horas");
  });

  it("matches the database: no hours (or open == close) means closed", () => {
    const closed = { withinHours: false, detail: "Sem horários — a loja não recebe pedidos" };
    expect(storeHoursInfo([], new Date(), TZ)).toEqual(closed);
    expect(storeHoursInfo(week("11:00:00", "11:00:00"), new Date(), TZ)).toEqual(closed);
  });
});
