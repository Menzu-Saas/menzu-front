import { describe, expect, it } from "vitest";
import {
  addressSchema,
  BRAND_SWATCHES,
  hexColorSchema,
  hoursSchema,
  inviteSchema,
  normalizeInstagram,
  operationSchema,
  overlappingIntervals,
  paymentsSchema,
  profileSchema,
  tableSchema,
} from "@/lib/schemas/settings";

const profile = {
  name: "Burger House",
  description: "",
  phone: "(11) 98765-4321",
  whatsapp: "",
  instagram: "",
  slug: "burger-house",
  primary_color: null,
};

describe("profileSchema", () => {
  it("accepts a valid profile and normalises optional fields", () => {
    const r = profileSchema.parse({ ...profile, instagram: "https://instagram.com/burger.house/", whatsapp: "11 3456-7890" });
    expect(r.phone).toBe("11987654321");
    expect(r.whatsapp).toBe("1134567890");
    expect(r.instagram).toBe("@burger.house");
    expect(r.description).toBeNull();
  });

  it.each(["ab", "-burger", "burger-", "Burger", "burger house", "burger_house", "a".repeat(51)])(
    "rejects slug %j",
    (slug) => {
      expect(profileSchema.safeParse({ ...profile, slug }).success).toBe(false);
    },
  );

  it.each(["abc", "burger-house-2", "a1b"])("accepts slug %j", (slug) => {
    expect(profileSchema.safeParse({ ...profile, slug }).success).toBe(true);
  });

  it("validates the hex colour", () => {
    expect(profileSchema.parse({ ...profile, primary_color: "#ff6b1a" }).primary_color).toBe("#FF6B1A");
    for (const bad of ["FF6B1A", "#FFF", "#GG6B1A", "#FF6B1A0", "red"]) {
      expect(profileSchema.safeParse({ ...profile, primary_color: bad }).success).toBe(false);
    }
  });

  it("requires a valid phone", () => {
    expect(profileSchema.safeParse({ ...profile, phone: "1234" }).success).toBe(false);
  });
});

describe("hexColorSchema / swatches", () => {
  it("every preset swatch is a valid colour", () => {
    for (const s of BRAND_SWATCHES) expect(hexColorSchema.safeParse(s.value).success).toBe(true);
  });
});

describe("normalizeInstagram", () => {
  it("strips @, URLs and trailing paths", () => {
    expect(normalizeInstagram("@burgerhouse")).toBe("burgerhouse");
    expect(normalizeInstagram("www.instagram.com/x")).toBe("x");
    expect(normalizeInstagram("instagram.com/burger?igsh=1")).toBe("burger");
  });
});

describe("addressSchema", () => {
  it("formats CEP and UF", () => {
    const r = addressSchema.parse({ address_cep: "01310100", address_state: "sp", address_city: " São Paulo " });
    expect(r.address_cep).toBe("01310-100");
    expect(r.address_state).toBe("SP");
    expect(r.address_city).toBe("São Paulo");
    expect(r.address_street).toBeNull();
  });

  it("rejects a short CEP and a bad UF", () => {
    expect(addressSchema.safeParse({ address_cep: "0131" }).success).toBe(false);
    expect(addressSchema.safeParse({ address_state: "S" }).success).toBe(false);
  });
});

describe("operationSchema", () => {
  const base = {
    min_order_cents: 0,
    avg_prep_minutes: 30,
    default_delivery_fee_cents: 700,
    accepts_delivery: true,
    accepts_pickup: false,
    accepts_dine_in: false,
    accepts_scheduling: false,
  };

  it("accepts zero minimum and fee", () => {
    expect(operationSchema.safeParse({ ...base, default_delivery_fee_cents: 0 }).success).toBe(true);
  });

  it("rejects negative minimum / fee and non-integers", () => {
    expect(operationSchema.safeParse({ ...base, min_order_cents: -1 }).success).toBe(false);
    expect(operationSchema.safeParse({ ...base, default_delivery_fee_cents: -100 }).success).toBe(false);
    expect(operationSchema.safeParse({ ...base, min_order_cents: 10.5 }).success).toBe(false);
  });

  it("bounds the prep time", () => {
    expect(operationSchema.safeParse({ ...base, avg_prep_minutes: 4 }).success).toBe(false);
    expect(operationSchema.safeParse({ ...base, avg_prep_minutes: 241 }).success).toBe(false);
    expect(operationSchema.safeParse({ ...base, avg_prep_minutes: Number.NaN }).success).toBe(false);
  });

  it("needs at least one order type", () => {
    const r = operationSchema.safeParse({ ...base, accepts_delivery: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["accepts_delivery"]);
  });
});

describe("paymentsSchema", () => {
  it("needs one method and keeps canonical order without duplicates", () => {
    expect(paymentsSchema.safeParse({ payment_methods: [] }).success).toBe(false);
    expect(paymentsSchema.parse({ payment_methods: ["CASH", "PIX", "CASH"] }).payment_methods).toEqual(["PIX", "CASH"]);
    expect(paymentsSchema.safeParse({ payment_methods: ["VR"] }).success).toBe(false);
  });
});

describe("hoursSchema", () => {
  it("accepts split shifts and seconds", () => {
    const r = hoursSchema.safeParse({
      hours: [
        { weekday: 1, opens_at: "11:00", closes_at: "15:00" },
        { weekday: 1, opens_at: "18:00", closes_at: "23:00" },
        { weekday: 0, opens_at: "00:00", closes_at: "23:59:59" },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects equal open/close and invalid times", () => {
    expect(hoursSchema.safeParse({ hours: [{ weekday: 1, opens_at: "10:00", closes_at: "10:00" }] }).success).toBe(false);
    expect(hoursSchema.safeParse({ hours: [{ weekday: 1, opens_at: "24:00", closes_at: "10:00" }] }).success).toBe(false);
    expect(hoursSchema.safeParse({ hours: [{ weekday: 7, opens_at: "09:00", closes_at: "10:00" }] }).success).toBe(false);
  });

  it("rejects overlaps, including across midnight and Saturday → Sunday", () => {
    expect(
      overlappingIntervals([
        { weekday: 1, opens_at: "11:00", closes_at: "15:00" },
        { weekday: 1, opens_at: "14:00", closes_at: "18:00" },
      ]),
    ).toEqual([[0, 1]]);
    expect(
      overlappingIntervals([
        { weekday: 5, opens_at: "18:00", closes_at: "02:00" },
        { weekday: 6, opens_at: "01:00", closes_at: "05:00" },
      ]),
    ).toHaveLength(1);
    expect(
      overlappingIntervals([
        { weekday: 6, opens_at: "20:00", closes_at: "03:00" },
        { weekday: 0, opens_at: "02:00", closes_at: "10:00" },
      ]),
    ).toHaveLength(1);
    expect(
      overlappingIntervals([
        { weekday: 1, opens_at: "11:00", closes_at: "15:00" },
        { weekday: 1, opens_at: "15:00", closes_at: "18:00" },
      ]),
    ).toEqual([]);
    const r = hoursSchema.safeParse({
      hours: [
        { weekday: 2, opens_at: "11:00", closes_at: "15:00" },
        { weekday: 2, opens_at: "12:00", closes_at: "13:00" },
      ],
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["hours", 1, "opens_at"]);
  });

  it("limits intervals per day", () => {
    const hours = [0, 2, 4, 6, 8].map((h) => ({ weekday: 3, opens_at: `0${h}:00`.slice(-5), closes_at: `0${h + 1}:00`.slice(-5) }));
    expect(hoursSchema.safeParse({ hours }).success).toBe(false);
  });
});

describe("tableSchema", () => {
  it("bounds the table number", () => {
    expect(tableSchema.safeParse({ number: 0 }).success).toBe(false);
    expect(tableSchema.safeParse({ number: 10000 }).success).toBe(false);
    expect(tableSchema.parse({ number: 12, label: "  " }).label).toBeNull();
    expect(tableSchema.parse({ number: 3, label: "Varanda" }).label).toBe("Varanda");
  });
});

describe("inviteSchema", () => {
  it("normalises the e-mail and checks the role", () => {
    expect(inviteSchema.parse({ email: " Ana@Exemplo.com ", role: "KITCHEN" }).email).toBe("ana@exemplo.com");
    expect(inviteSchema.safeParse({ email: "ana", role: "KITCHEN" }).success).toBe(false);
    expect(inviteSchema.safeParse({ email: "ana@exemplo.com", role: "ADMIN" }).success).toBe(false);
  });
});
