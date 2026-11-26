import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PLATFORM_ONLINE_FEE_BPS, onlineFeePercent } from "@/server/payments/asaas-config";

describe("taxa de pagamento online do Menzu", () => {
  it("é de 3,5% por padrão", () => {
    expect(PLATFORM_ONLINE_FEE_BPS).toBe(350);
    expect(onlineFeePercent()).toBe(3.5);
  });

  it("converte pontos-base e rejeita valores inválidos", () => {
    expect(onlineFeePercent(0)).toBe(0);
    expect(onlineFeePercent(1250)).toBe(12.5);
    expect(() => onlineFeePercent(-1)).toThrow();
    expect(() => onlineFeePercent(10_001)).toThrow();
    expect(() => onlineFeePercent(3.5)).toThrow();
  });
});


