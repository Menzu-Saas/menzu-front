import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { formatCpf, isValidCpf, maskedCpf } from "@/lib/cpf";
import { decryptCpf, encryptCpf } from "@/server/payments/cpf-vault";

const VALID = "52998224725"; // CPF de teste com dígitos verificadores corretos
const USER_A = "123e4567-e89b-42d3-a456-426614174000";
const USER_B = "223e4567-e89b-42d3-a456-426614174000";

describe("CPF", () => {
  it("valida dígitos verificadores e rejeita sequências repetidas", () => {
    expect(isValidCpf(VALID)).toBe(true);
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224726")).toBe(false);
    expect(isValidCpf("11111111111")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });

  it("formata enquanto digita e mascara para exibição", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(formatCpf("5299")).toBe("529.9");
    expect(maskedCpf("725")).toBe("•••.•••.••7-25");
  });
});

describe("cofre de CPF", () => {
  const original = process.env.MENZU_CPF_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.MENZU_CPF_ENCRYPTION_KEY = "ab".repeat(32);
  });
  afterEach(() => {
    process.env.MENZU_CPF_ENCRYPTION_KEY = original;
  });

  it("cifra e decifra, sem deixar o CPF legível no valor guardado", () => {
    const encrypted = encryptCpf("529.982.247-25", USER_A);
    expect(encrypted).not.toContain(VALID);
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(decryptCpf(encrypted, USER_A)).toBe(VALID);
  });

  it("usa IV aleatório: o mesmo CPF gera valores diferentes", () => {
    expect(encryptCpf(VALID, USER_A)).not.toBe(encryptCpf(VALID, USER_A));
  });

  it("não decifra um valor copiado para outro usuário", () => {
    expect(() => decryptCpf(encryptCpf(VALID, USER_A), USER_B)).toThrow();
  });

  it("detecta adulteração e recusa CPF inválido ou chave ausente", () => {
    const parts = encryptCpf(VALID, USER_A).split(".");
    parts[3] = Buffer.from("adulterado").toString("base64");
    expect(() => decryptCpf(parts.join("."), USER_A)).toThrow();
    expect(() => encryptCpf("11111111111", USER_A)).toThrow("INVALID_CPF");
    process.env.MENZU_CPF_ENCRYPTION_KEY = "curta";
    expect(() => encryptCpf(VALID, USER_A)).toThrow("CPF_ENCRYPTION_KEY_NOT_CONFIGURED");
  });
});
