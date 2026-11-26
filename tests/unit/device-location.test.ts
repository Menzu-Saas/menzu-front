import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { addressFromLocation } = vi.hoisted(() => ({ addressFromLocation: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/actions/guest-address", () => ({ addressFromLocation }));

import { addressFromDevice, requestLocationPermission } from "@/components/checkout/device-location";

const paulista = { street: "Av. Paulista", number: "1578", neighborhood: "Bela Vista", city: "São Paulo", state: "SP", cep: "01310200" };

function mockGeolocation(result: { coords?: { latitude: number; longitude: number; accuracy: number }; errorCode?: number }) {
  const getCurrentPosition = vi.fn((ok: PositionCallback, fail: PositionErrorCallback) => {
    if (result.coords) ok({ coords: result.coords, timestamp: Date.now() } as GeolocationPosition);
    else fail({ code: result.errorCode ?? 2 } as GeolocationPositionError);
  });
  Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
  return getCurrentPosition;
}

beforeEach(() => { addressFromLocation.mockReset(); sessionStorage.clear(); });
afterEach(() => { Object.defineProperty(navigator, "geolocation", { value: undefined, configurable: true }); });

describe("endereço pela localização do aparelho", () => {
  it("preenche o endereço e guarda o ponto exato quando o GPS é preciso", async () => {
    mockGeolocation({ coords: { latitude: -23.5614, longitude: -46.6559, accuracy: 20 } });
    addressFromLocation.mockResolvedValue({ ok: true, data: paulista });
    const result = await addressFromDevice();
    expect(addressFromLocation).toHaveBeenCalledWith(-23.5614, -46.6559);
    expect(result).toEqual({ ok: true, located: true, address: { ...paulista, latitude: -23.5614, longitude: -46.6559 } });
  });

  it("com GPS impreciso preenche o endereço mas não marca o ponto", async () => {
    mockGeolocation({ coords: { latitude: -23.5614, longitude: -46.6559, accuracy: 900 } });
    addressFromLocation.mockResolvedValue({ ok: true, data: paulista });
    const result = await addressFromDevice();
    expect(result).toEqual({ ok: true, located: false, address: paulista });
  });

  it("explica quando a permissão é negada, sem chamar o servidor", async () => {
    mockGeolocation({ errorCode: 1 });
    expect(await addressFromDevice()).toMatchObject({ ok: false, reason: "denied" });
    expect(addressFromLocation).not.toHaveBeenCalled();
  });

  it("explica quando o endereço do ponto não é encontrado", async () => {
    mockGeolocation({ coords: { latitude: -23.5, longitude: -46.6, accuracy: 10 } });
    addressFromLocation.mockResolvedValue({ ok: false, error: "Não encontramos o endereço deste ponto. Preencha manualmente." });
    expect(await addressFromDevice()).toMatchObject({ ok: false, reason: "unavailable", message: expect.stringContaining("Preencha") });
  });

  it("navegador sem localização", async () => {
    expect(await addressFromDevice()).toMatchObject({ ok: false, reason: "unsupported" });
  });

  it("pedir só a permissão não envia nada ao servidor", async () => {
    const ask = mockGeolocation({ coords: { latitude: -23.5, longitude: -46.6, accuracy: 10 } });
    expect(await requestLocationPermission()).toBe(true);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(addressFromLocation).not.toHaveBeenCalled();
    mockGeolocation({ errorCode: 1 });
    expect(await requestLocationPermission()).toBe(false);
  });
});

describe("busca reversa no servidor", () => {
  const original = process.env.MENZU_GEOCODING_ENABLED;
  afterEach(() => { process.env.MENZU_GEOCODING_ENABLED = original; vi.unstubAllGlobals(); });

  it("monta o endereço com UF e CEP, identifica-se ao serviço e só envia as coordenadas", async () => {
    process.env.MENZU_GEOCODING_ENABLED = "true";
    const fetchMock = vi.fn(async () => Response.json({ features: [{ properties: {
      countrycode: "BR", street: "Av. Paulista", housenumber: "1578", district: "Bela Vista", city: "São Paulo", state: "São Paulo", postcode: "01310-200",
    } }] }));
    vi.stubGlobal("fetch", fetchMock);
    const { reverseGeocode } = await import("@/server/geocoding");
    expect(await reverseGeocode(-23.561414, -46.655881)).toEqual(paulista);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://photon.komoot.io/reverse?lat=-23.561414&lon=-46.655881&limit=5");
    expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(/Menzu/);
  });

  it("pula o resultado sem rua (só o bairro) e usa o próximo com rua", async () => {
    process.env.MENZU_GEOCODING_ENABLED = "true";
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ features: [
      { properties: { countrycode: "BR", type: "other", city: "Recife", district: "Boa Viagem", state: "Pernambuco" } },
      { properties: { countrycode: "BR", type: "house", street: "Rua Jack Ayres", housenumber: "210", city: "Recife", state: "Pernambuco" } },
    ] })));
    const { reverseGeocode } = await import("@/server/geocoding");
    expect(await reverseGeocode(-8.1196, -34.9006)).toEqual({ street: "Rua Jack Ayres", number: "210", neighborhood: "Boa Viagem", city: "Recife", state: "PE", cep: "" });
  });

  it("ignora pontos fora do Brasil e respeita a chave desligada", async () => {
    process.env.MENZU_GEOCODING_ENABLED = "true";
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ features: [{ properties: { countrycode: "US", street: "5th Ave", city: "New York" } }] })));
    const { reverseGeocode } = await import("@/server/geocoding");
    expect(await reverseGeocode(40.7, -73.9)).toBeNull();
    process.env.MENZU_GEOCODING_ENABLED = "false";
    expect(await reverseGeocode(-23.5, -46.6)).toBeNull();
  });
});

