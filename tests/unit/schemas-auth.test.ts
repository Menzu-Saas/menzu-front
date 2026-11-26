import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/safe-next";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/schemas/auth";
import { onboardingSchema, slugSchema } from "@/lib/schemas/restaurant";

function firstError(result: { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } }) {
  return result.error?.issues[0];
}

describe("auth schemas", () => {
  it("login requires a valid e-mail and a password", () => {
    expect(loginSchema.safeParse({ email: "dono@burgerhouse.test", password: "x" }).success).toBe(true);
    const bad = loginSchema.safeParse({ email: "nao-e-email", password: "" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues.map((i) => i.path[0])).toEqual(["email", "password"]);
    expect(firstError(bad)?.message).toBe("Informe um e-mail válido.");
  });

  it("trims and lowercases e-mail", () => {
    const r = loginSchema.parse({ email: "  Dono@BurgerHouse.TEST ", password: "x" });
    expect(r.email).toBe("dono@burgerhouse.test");
  });

  it("signup requires name and password with at least 8 chars", () => {
    expect(signupSchema.safeParse({ name: "Marina", email: "m@x.com", password: "12345678" }).success).toBe(true);
    const short = signupSchema.safeParse({ name: "Marina", email: "m@x.com", password: "1234567" });
    expect(short.success).toBe(false);
    expect(firstError(short)?.message).toBe("A senha deve ter pelo menos 8 caracteres.");
    expect(signupSchema.safeParse({ name: " ", email: "m@x.com", password: "12345678" }).success).toBe(false);
  });

  it("forgot password only needs an e-mail", () => {
    expect(forgotPasswordSchema.safeParse({ email: "m@x.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("reset password requires matching passwords of 8+", () => {
    expect(resetPasswordSchema.safeParse({ password: "Teste-1234!", confirm: "Teste-1234!" }).success).toBe(true);
    const mismatch = resetPasswordSchema.safeParse({ password: "Teste-1234!", confirm: "Teste-1235!" });
    expect(mismatch.success).toBe(false);
    expect(firstError(mismatch)?.path).toEqual(["confirm"]);
    expect(resetPasswordSchema.safeParse({ password: "short", confirm: "short" }).success).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("accepts same-origin absolute paths", () => {
    expect(safeNextPath("/painel")).toBe("/painel");
    expect(safeNextPath("/painel/pedidos?status=NEW")).toBe("/painel/pedidos?status=NEW");
  });
  it("rejects external, protocol-relative and malformed targets", () => {
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("/painel\nSet-Cookie: x")).toBeNull();
    expect(safeNextPath("painel")).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(["/a", "/b"])).toBeNull();
  });
});

describe("authErrorMessage", () => {
  it("maps Supabase auth error codes to pt-BR", () => {
    expect(authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe(
      "E-mail ou senha incorretos.",
    );
    expect(authErrorMessage({ code: "email_not_confirmed" })).toMatch(/Confirme seu e-mail/);
    expect(authErrorMessage({ code: "user_already_exists" })).toMatch(/já está cadastrado/);
  });
  it("falls back to a generic message", () => {
    expect(authErrorMessage({ code: "something_new" })).toBe("Algo deu errado. Tente novamente.");
    expect(authErrorMessage(null)).toBe("Algo deu errado. Tente novamente.");
  });
});

describe("restaurant schemas", () => {
  const valid = {
    name: "Burger da Vila",
    slug: "burger-da-vila",
    phone: "(11) 98765-4321",
    whatsapp: "",
    address_cep: "01310-100",
    address_street: "Av. Paulista",
    address_number: "1000",
    address_complement: "",
    address_neighborhood: "Bela Vista",
    address_city: "São Paulo",
    address_state: "sp",
    accepts_delivery: true,
    accepts_pickup: true,
    accepts_dine_in: false,
    min_order_cents: 2000,
    avg_prep_minutes: 35,
    default_delivery_fee_cents: 700,
    hours: [{ weekday: 1, opens_at: "18:00", closes_at: "02:00" }],
  };

  it("accepts a complete onboarding payload and normalizes it", () => {
    const r = onboardingSchema.parse(valid);
    expect(r.phone).toBe("11987654321");
    expect(r.whatsapp).toBeUndefined();
    expect(r.address_state).toBe("SP");
    expect(r.address_cep).toBe("01310100");
  });

  it("validates slug format like the database", () => {
    expect(slugSchema.safeParse("ab").success).toBe(false);
    expect(slugSchema.safeParse("-abc").success).toBe(false);
    expect(slugSchema.safeParse("abc-").success).toBe(false);
    expect(slugSchema.safeParse("Abc").success).toBe(false);
    expect(slugSchema.safeParse("burger-house-2").success).toBe(true);
  });

  it("requires at least one order type and sane hours", () => {
    expect(
      onboardingSchema.safeParse({ ...valid, accepts_delivery: false, accepts_pickup: false, accepts_dine_in: false })
        .success,
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({ ...valid, hours: [{ weekday: 1, opens_at: "18:00", closes_at: "18:00" }] }).success,
    ).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, hours: [{ weekday: 7, opens_at: "1:00", closes_at: "2:00" }] }).success).toBe(
      false,
    );
  });

  it("rejects invalid phone and negative money", () => {
    expect(onboardingSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, min_order_cents: -1 }).success).toBe(false);
  });
});
