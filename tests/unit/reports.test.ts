import { describe, expect, it } from "vitest";
import { parseReportRange, percentOf, rangeLabel, rangeQuery } from "@/lib/reports";
import { assignableRoles, canManageRole, inviteUrl } from "@/lib/team";

const TZ = "America/Sao_Paulo";
// 2026-10-05 15:00 in São Paulo (UTC-3).
const NOW = new Date("2026-10-05T18:00:00Z");

describe("parseReportRange", () => {
  it("defaults to the last 7 days", () => {
    const r = parseReportRange({}, NOW, TZ);
    expect(r.preset).toBe("7d");
    expect(r.fromDay).toBe("2026-09-29");
    expect(r.toDay).toBe("2026-10-05");
    expect(r.days).toBe(7);
    expect(r.from.toISOString()).toBe("2026-09-29T03:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-10-06T03:00:00.000Z");
  });

  it("supports today, 30 days and this month", () => {
    expect(parseReportRange({ periodo: "hoje" }, NOW, TZ).days).toBe(1);
    expect(parseReportRange({ periodo: "30d" }, NOW, TZ).fromDay).toBe("2026-09-06");
    const mes = parseReportRange({ periodo: "mes" }, NOW, TZ);
    expect([mes.fromDay, mes.toDay, mes.days]).toEqual(["2026-10-01", "2026-10-05", 5]);
  });

  it("parses a valid custom range", () => {
    const r = parseReportRange({ de: "2026-09-01", ate: "2026-09-30" }, NOW, TZ);
    expect(r.preset).toBe("custom");
    expect(r.days).toBe(30);
    expect(r.invalid).toBeUndefined();
    expect(rangeQuery(r)).toBe("de=2026-09-01&ate=2026-09-30");
    expect(rangeLabel(r)).toBe("01/09/2026 – 30/09/2026");
  });

  it.each([
    [{ de: "2026-09-30", ate: "2026-09-01" }],
    [{ de: "2026-02-30", ate: "2026-03-01" }],
    [{ de: "2026-10-01", ate: "2026-10-09" }],
    [{ de: "2024-01-01", ate: "2026-10-01" }],
    [{ de: "ontem", ate: "2026-10-01" }],
  ])("falls back to 7 days for an invalid custom range %j", (params) => {
    const r = parseReportRange(params, NOW, TZ);
    expect(r.preset).toBe("7d");
    expect(r.invalid).toBe(true);
  });

  it("ignores unknown presets", () => {
    expect(parseReportRange({ periodo: "ano" }, NOW, TZ).preset).toBe("7d");
    expect(rangeQuery(parseReportRange({ periodo: "mes" }, NOW, TZ))).toBe("periodo=mes");
  });
});

describe("percentOf", () => {
  it("rounds and handles zero totals", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(5, 0)).toBe(0);
  });
});

describe("team rules", () => {
  it("only owners grant OWNER", () => {
    expect(assignableRoles("OWNER")).toContain("OWNER");
    expect(assignableRoles("MANAGER")).not.toContain("OWNER");
    expect(assignableRoles("ATTENDANT")).toEqual([]);
  });

  it("managers cannot touch owners", () => {
    expect(canManageRole("MANAGER", "OWNER")).toBe(false);
    expect(canManageRole("MANAGER", "KITCHEN")).toBe(true);
    expect(canManageRole("OWNER", "OWNER")).toBe(true);
    expect(canManageRole("ATTENDANT", "KITCHEN")).toBe(false);
  });

  it("builds the invite link", () => {
    expect(inviteUrl("http://localhost:3000/", "abc123")).toBe("http://localhost:3000/convite/abc123");
  });
});
