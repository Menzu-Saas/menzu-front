import { describe, expect, it } from "vitest";
import { AppUrlNotConfiguredError, resolveAppOrigin } from "@/lib/app-origin";

const headers =
  (map: Record<string, string>) =>
  (name: string): string | null =>
    map[name] ?? null;

describe("resolveAppOrigin", () => {
  it("uses the configured URL without trailing slashes", () => {
    expect(
      resolveAppOrigin({ configured: " https://menzu.app/ ", nodeEnv: "production", header: headers({}) }),
    ).toBe("https://menzu.app");
  });

  it("never trusts request headers in production", () => {
    expect(() =>
      resolveAppOrigin({ configured: "", nodeEnv: "production", header: headers({ host: "evil.example" }) }),
    ).toThrow(AppUrlNotConfiguredError);
  });

  it("falls back to the request host outside production", () => {
    expect(resolveAppOrigin({ configured: undefined, nodeEnv: "development", header: headers({ host: "127.0.0.1:3001" }) })).toBe(
      "http://127.0.0.1:3001",
    );
    expect(
      resolveAppOrigin({
        configured: undefined,
        nodeEnv: "development",
        header: headers({ "x-forwarded-host": "tunnel.example", "x-forwarded-proto": "https" }),
      }),
    ).toBe("https://tunnel.example");
  });
});
