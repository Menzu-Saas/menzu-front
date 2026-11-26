import { expect, it } from "vitest";
import { courierCommandAction, getCourierDashboardAction } from "@/server/actions/courier";
import { BETA_UNAVAILABLE } from "@/lib/beta-unavailable";

it("bloqueia funções externas mesmo quando chamadas diretamente, antes de qualquer acesso ao banco", async () => {
  const results = await Promise.all([
    getCourierDashboardAction("loja"),
    courierCommandAction("loja", { action: "offer", payload: { order_id: "pedido" } }),
  ]);
  for (const result of results) expect(result).toMatchObject({ ok: false, error: BETA_UNAVAILABLE });
});
