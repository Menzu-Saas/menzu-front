import { beforeEach, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getCurrentMembership: vi.fn(),
  getMemberships: vi.fn(),
  writeCurrentRestaurantCookie: vi.fn(),
}));
vi.mock("@/server/auth", () => auth);
import { restaurantAccessDestination } from "@/server/restaurant-access";

beforeEach(() => {
  vi.resetAllMocks();
  auth.getMemberships.mockResolvedValue([]);
});

it.each([["OWNER", "/painel"], ["ATTENDANT", "/painel"], ["KITCHEN", "/cozinha"]])("encaminha %s para %s", async (role, destination) => {
  auth.getCurrentMembership.mockResolvedValue({ role, restaurant_id: "loja" });
  expect(await restaurantAccessDestination()).toBe(destination);
  expect(auth.writeCurrentRestaurantCookie).not.toHaveBeenCalled();
});

it("não encaminha uma conta exclusiva de entregador para uma rota removida", async () => {
  const courier = { role: "DELIVERY", restaurant_id: "loja" };
  auth.getCurrentMembership.mockResolvedValue(courier);
  auth.getMemberships.mockResolvedValue([courier]);
  expect(await restaurantAccessDestination()).toBe("/sem-restaurante");
});

it("seleciona uma associação de restaurante quando a associação atual é de entregador", async () => {
  auth.getCurrentMembership.mockResolvedValue({ role: "DELIVERY", restaurant_id: "a" });
  auth.getMemberships.mockResolvedValue([{ role: "DELIVERY", restaurant_id: "a" }, { role: "MANAGER", restaurant_id: "b" }]);
  expect(await restaurantAccessDestination()).toBe("/painel");
  expect(auth.writeCurrentRestaurantCookie).toHaveBeenCalledWith("b");
});

it("encaminha contas sem associação para a tela de acesso ao restaurante", async () => {
  auth.getCurrentMembership.mockResolvedValue(null);
  expect(await restaurantAccessDestination()).toBe("/sem-restaurante");
});
