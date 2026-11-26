import { describe, expect, it } from "vitest";
import { isUuid } from "@/lib/uuid";

describe("isUuid", () => {
  it("accepts RFC 4122 ids (including the seed ids)", () => {
    expect(isUuid("10000000-000d-4000-8000-000000001063")).toBe(true);
    expect(isUuid("F2EEDBA2-D063-4309-866C-8084048E916B")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const v of ["", "abc", "10000000-000d-4000-8000-00000000106", "10000000-000d-0000-8000-000000001063",
      "10000000-000d-4000-c000-000000001063", "------------------------------------", "x0000000-000d-4000-8000-000000001063",
      " 10000000-000d-4000-8000-000000001063", null, 42]) {
      expect(isUuid(v)).toBe(false);
    }
  });
});
