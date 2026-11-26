"use server";

import { cookies } from "next/headers";
import { isUuid } from "@/lib/uuid";
import { getOrderReviewState, saveOrderFeedback } from "@/server/queries/public-menu";

export async function confirmOrderReceipt(id: string) {
  if (!isUuid(id)) return "unavailable";
  const token = (await cookies()).get(`menzu_receipt_${id}`)?.value;
  return token ? getOrderReviewState(id, token, true) : "unavailable";
}

export async function submitOrderFeedback(id: string, _previous: string, form: FormData) {
  if (!isUuid(id)) return "Pedido inválido.";
  const token = (await cookies()).get(`menzu_receipt_${id}`)?.value;
  if (!token) return "Abra a confirmação do pedido para avaliar.";
  if (await getOrderReviewState(id, token) !== "ready") return "A avaliação requer um pedido concluído e o recebimento confirmado.";
  const restaurant = form.get("restaurant");
  const system = form.get("system");
  const restaurantComment = form.get("restaurantComment");
  const systemComment = form.get("systemComment");
  if (typeof restaurant !== "string" || !/^[1-5]$/.test(restaurant)
    || typeof system !== "string" || !/^[1-5]$/.test(system)
    || typeof restaurantComment !== "string" || restaurantComment.length > 500
    || typeof systemComment !== "string" || systemComment.length > 500) {
    return "Selecione as duas notas e limite cada comentário a 500 caracteres.";
  }
  const { data, error } = await saveOrderFeedback({
    p_order_id: id, p_token: token, p_restaurant_stars: Number(restaurant),
    p_system_stars: Number(system), p_restaurant_comment: restaurantComment,
    p_system_comment: systemComment,
  });
  if (error) return "Não foi possível salvar agora. Tente novamente.";
  return data ? "ok" : "Este pedido já foi avaliado ou não pode mais ser avaliado.";
}
