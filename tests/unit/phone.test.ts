import { describe, it, expect } from "vitest";
import { formatPhone, isValidBrPhone, onlyDigits, telLink, whatsappLink } from "@/lib/phone";
describe("phone", () => {
  it("formats", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
  });
  it("validates", () => {
    expect(isValidBrPhone("11987654321")).toBe(true);
    expect(isValidBrPhone("119876")).toBe(false);
    expect(isValidBrPhone("01987654321")).toBe(false);
  });
  it("digits + whatsapp", () => {
    expect(onlyDigits("(11) 98765-4321")).toBe("11987654321");
    expect(whatsappLink("11987654321", "Pedido #1045")).toBe("https://wa.me/5511987654321?text=Pedido%20%231045");
    expect(whatsappLink("5511987654321", "x")).toBe("https://wa.me/5511987654321?text=x");
  });
});

describe("telLink", () => {
  it("builds an E.164 tel URI and never doubles the country code", () => {
    expect(telLink("(11) 98765-4321")).toBe("tel:+5511987654321");
    expect(telLink("5511987654321")).toBe("tel:+5511987654321");
    expect(telLink("1134567890")).toBe("tel:+551134567890");
  });
});
