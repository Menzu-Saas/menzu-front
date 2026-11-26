import { describe, expect, it } from "vitest";
import { restaurantAccentStyle, validRestaurantColor } from "@/lib/restaurant-accent";

describe("restaurant accent", () => {
  it("accepts strict #RRGGBB and uppercases it", () => {
    expect(validRestaurantColor("#e2540a")).toBe("#E2540A");
    expect(restaurantAccentStyle("#12a150")).toEqual({ "--mz-restaurant-accent": "#12A150" });
  });

  it("rejects anything else", () => {
    for (const bad of [null, undefined, "", "red", "#fff", "#12345G", "#123456;background:url(x)", "12A150", 123]) {
      expect(validRestaurantColor(bad)).toBeNull();
      expect(restaurantAccentStyle(bad)).toBeUndefined();
    }
  });
});
