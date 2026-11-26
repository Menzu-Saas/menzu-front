import { beforeEach, expect, it, vi } from "vitest";
import { ADMIN_ROLES, KITCHEN_ROLES } from "@/lib/role-home";
import { advanceDeliveryOrderAction, listDeliveryOrdersAction, receiveDeliveryPaymentAction } from "@/server/actions/delivery";
import { advanceKitchenOrderAction } from "@/server/actions/kitchen";
import { createCategoryAction, reorderAction } from "@/server/actions/menu";
import { markPaymentPaidAction, updateOrderStatusAction } from "@/server/actions/orders";

const { requireMemberOf, createSupabaseServerClient } = vi.hoisted(() => ({
  requireMemberOf: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth", () => ({ requireMemberOf }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient }));

const restaurantId = "10000000-0000-4000-8000-000000000001";
const recordId = "20000000-0000-4000-8000-000000000002";
const query = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn(),
  maybeSingle: vi.fn(),
};
const supabase = { from: vi.fn(), rpc: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  requireMemberOf.mockResolvedValue({ ok: true, restaurantId, restaurant: { slug: "loja" } });
  createSupabaseServerClient.mockResolvedValue(supabase);
  supabase.from.mockReturnValue(query);
  supabase.rpc.mockResolvedValue({ data: [], error: null });
  query.maybeSingle.mockResolvedValue({ data: null, error: null });
  query.in.mockReturnValue(query);
});

it.each([
  ["status do pedido", () => updateOrderStatusAction(restaurantId, recordId, ["CONFIRMED"]), "orders", "ORDER_NOT_FOUND"],
  ["pagamento do pedido", () => markPaymentPaidAction(restaurantId, recordId), "payments", "PAYMENT_NOT_FOUND"],
  ["status da entrega", () => advanceDeliveryOrderAction(restaurantId, recordId, "DELIVERED"), "orders", "ORDER_NOT_FOUND"],
  ["pagamento da entrega", () => receiveDeliveryPaymentAction(restaurantId, recordId), "payments", "PAYMENT_NOT_FOUND"],
] as const)("bloqueia %s de fora da loja selecionada", async (_label, action, table, code) => {
  expect(await action()).toMatchObject({ ok: false, code });
  expect(requireMemberOf).toHaveBeenCalledWith(restaurantId, ADMIN_ROLES);
  expect(supabase.from).toHaveBeenCalledWith(table);
  expect(query.eq).toHaveBeenCalledWith("restaurant_id", restaurantId);
  expect(query.eq).toHaveBeenCalledWith("id", recordId);
  expect(supabase.rpc).not.toHaveBeenCalled();
});

it("encaminha a alteração ao banco quando o pedido pertence à loja selecionada", async () => {
  query.maybeSingle.mockResolvedValue({ data: { id: recordId }, error: null });
  expect(await updateOrderStatusAction(restaurantId, recordId, ["CONFIRMED"])).toMatchObject({ ok: true });
  expect(supabase.rpc).toHaveBeenCalledWith("update_order_status", expect.objectContaining({ p_order_id: recordId, p_to: "CONFIRMED" }));
});

it("encerra as ações de entregas quando a sessão ou o papel não é autorizado", async () => {
  requireMemberOf.mockResolvedValue({ ok: false, error: "Sem acesso" });
  expect(await listDeliveryOrdersAction(restaurantId)).toMatchObject({ ok: false });
  expect(await advanceDeliveryOrderAction(restaurantId, recordId, "DELIVERED")).toMatchObject({ ok: false });
  expect(await receiveDeliveryPaymentAction(restaurantId, recordId)).toMatchObject({ ok: false });
  expect(requireMemberOf.mock.calls).toEqual(Array.from({ length: 3 }, () => [restaurantId, ADMIN_ROLES]));
  expect(createSupabaseServerClient).not.toHaveBeenCalled();
});

it("restringe alterações da cozinha aos pedidos retornados para a loja", async () => {
  expect(await advanceKitchenOrderAction(restaurantId, recordId, "READY")).toMatchObject({ ok: false, code: "ORDER_NOT_FOUND" });
  expect(requireMemberOf).toHaveBeenCalledWith(restaurantId, KITCHEN_ROLES);
  expect(supabase.rpc.mock.calls).toEqual([["kitchen_orders", { p_restaurant_id: restaurantId }]]);
});

it("confere a loja do cardápio antes de criar uma categoria", async () => {
  expect(await createCategoryAction(restaurantId, recordId, { name: "Categoria" })).toMatchObject({ ok: false });
  expect(supabase.from.mock.calls).toEqual([["menus"]]);
  expect(query.eq).toHaveBeenCalledWith("restaurant_id", restaurantId);
  expect(query.maybeSingle).toHaveBeenCalled();
});

it("bloqueia reordenação com IDs ausentes na loja", async () => {
  query.in.mockResolvedValueOnce({ count: 0, error: null });
  expect(await reorderAction(restaurantId, "products", [recordId])).toMatchObject({ ok: false });
  expect(query.eq).toHaveBeenCalledWith("restaurant_id", restaurantId);
  expect(query.in).toHaveBeenCalledWith("id", [recordId]);
  expect(supabase.rpc).not.toHaveBeenCalled();
});
