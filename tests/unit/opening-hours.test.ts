import { describe, expect, it } from "vitest";
import {
  closingTime,
  formatHourLabel,
  formatScheduled,
  isOpenNow,
  nextOpening,
  scheduleSlots,
  type OpeningHourInput,
} from "@/lib/opening-hours";

const TZ = "America/Sao_Paulo"; // UTC-03:00, no DST

// Every weekday 11:00–23:00.
const daily: OpeningHourInput[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opens_at: "11:00:00",
  closes_at: "23:00:00",
}));

// 2026-10-05 is a Monday (weekday 1).
const at = (local: string) => new Date(`${local}-03:00`);

describe("isOpenNow", () => {
  it("is open inside the interval", () => {
    expect(isOpenNow(daily, TZ, at("2026-10-05T12:30:00"))).toBe(true);
    expect(isOpenNow(daily, TZ, at("2026-10-05T11:00:00"))).toBe(true);
  });

  it("is closed outside the interval (closing time is exclusive)", () => {
    expect(isOpenNow(daily, TZ, at("2026-10-05T08:00:00"))).toBe(false);
    expect(isOpenNow(daily, TZ, at("2026-10-05T23:00:00"))).toBe(false);
  });

  it("handles overnight intervals (18:00–02:00) at 01:00 the next day", () => {
    const friday: OpeningHourInput[] = [{ weekday: 5, opens_at: "18:00", closes_at: "02:00" }];
    // 2026-10-10 is a Saturday: 01:00 belongs to Friday's overnight interval.
    expect(isOpenNow(friday, TZ, at("2026-10-10T01:00:00"))).toBe(true);
    expect(isOpenNow(friday, TZ, at("2026-10-09T19:00:00"))).toBe(true);
    expect(isOpenNow(friday, TZ, at("2026-10-10T02:30:00"))).toBe(false);
    // Thursday 01:00 is not covered (no Wednesday interval).
    expect(isOpenNow(friday, TZ, at("2026-10-08T01:00:00"))).toBe(false);
  });

  it("is closed when there are no opening hours (mirrors menzu_is_open_at)", () => {
    expect(isOpenNow([], TZ, at("2026-10-05T12:00:00"))).toBe(false);
  });

  it("evaluates in the restaurant time zone, not UTC", () => {
    // 01:00Z is 22:00 local on the previous day: open.
    expect(isOpenNow(daily, TZ, new Date("2026-10-06T01:00:00Z"))).toBe(true);
  });
});

describe("nextOpening", () => {
  it("returns today's opening when it is still ahead", () => {
    expect(nextOpening(daily, TZ, at("2026-10-05T08:00:00"))?.toISOString()).toBe(at("2026-10-05T11:00:00").toISOString());
  });

  it("returns tomorrow's opening after closing", () => {
    expect(nextOpening(daily, TZ, at("2026-10-05T23:30:00"))?.toISOString()).toBe(at("2026-10-06T11:00:00").toISOString());
  });

  it("skips closed weekdays", () => {
    const weekend: OpeningHourInput[] = [{ weekday: 6, opens_at: "12:00", closes_at: "15:00" }];
    expect(nextOpening(weekend, TZ, at("2026-10-05T10:00:00"))?.toISOString()).toBe(at("2026-10-10T12:00:00").toISOString());
  });

  it("returns null without opening hours", () => {
    expect(nextOpening([], TZ, at("2026-10-05T10:00:00"))).toBeNull();
  });
});

describe("closingTime / labels", () => {
  it("returns the end of the current interval", () => {
    expect(closingTime(daily, TZ, at("2026-10-05T12:00:00"))?.toISOString()).toBe(at("2026-10-05T23:00:00").toISOString());
    expect(closingTime(daily, TZ, at("2026-10-05T08:00:00"))).toBeNull();
  });

  it("formats hour labels the pt-BR way", () => {
    expect(formatHourLabel(at("2026-10-05T23:00:00"), TZ)).toBe("23h");
    expect(formatHourLabel(at("2026-10-05T11:30:00"), TZ)).toBe("11h30");
  });
});

describe("scheduleSlots", () => {
  it("generates 15-minute slots at least prep minutes ahead, only while open", () => {
    const slots = scheduleSlots(daily, TZ, at("2026-10-05T22:00:00"), 30, 2);
    // 22:30 and 22:45 today (23:00 is closed), then tomorrow from 11:00.
    expect(slots[0].at.toISOString()).toBe(at("2026-10-05T22:30:00").toISOString());
    expect(slots[1].at.toISOString()).toBe(at("2026-10-05T22:45:00").toISOString());
    expect(slots[2].at.toISOString()).toBe(at("2026-10-06T11:00:00").toISOString());
    expect(slots.every((s) => isOpenNow(daily, TZ, s.at))).toBe(true);
    expect(slots[0].dateKey).toBe("2026-10-05");
    expect(slots[0].timeLabel).toBe("22:30");
  });

  it("rounds the first slot up to the next quarter hour", () => {
    const slots = scheduleSlots(daily, TZ, at("2026-10-05T12:07:00"), 35, 1);
    expect(slots[0].timeLabel).toBe("12:45");
  });
});

describe("formatScheduled", () => {
  it("names the day: hoje, amanhã or weekday + date", () => {
    const now = at("2026-10-05T18:00:00");
    expect(formatScheduled(at("2026-10-05T19:00:00"), TZ, now)).toBe("hoje às 19:00");
    expect(formatScheduled(at("2026-10-06T12:30:00").toISOString(), TZ, now)).toBe("amanhã às 12:30");
    expect(formatScheduled(at("2026-10-08T19:00:00"), TZ, now)).toMatch(/^qui\.?, 08\/10 às 19:00$/);
  });
});
