// Maps the database error contract (`MENZU:<CODE>` in message, pt-BR text in detail) to UI messages.

export const MENZU_ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Entre na sua conta para finalizar o pedido.",
  IDEMPOTENCY_CONFLICT: "Esta tentativa já foi usada com outro pedido.",
  RESTAURANT_NOT_FOUND: "Restaurante não encontrado.",
  RESTAURANT_CLOSED: "O restaurante está fechado no momento.",
  RESTAURANT_PAUSED: "O restaurante pausou os pedidos temporariamente.",
  OUTSIDE_HOURS: "O restaurante não está aberto neste horário.",
  SCHEDULING_DISABLED: "Este restaurante não aceita pedidos agendados.",
  INVALID_SCHEDULE: "Horário de agendamento inválido.",
  ORDER_TYPE_DISABLED: "Este tipo de pedido não está disponível.",
  TABLE_NOT_FOUND: "Mesa não encontrada.",
  ADDRESS_REQUIRED: "Informe o endereço completo para entrega.",
  OUT_OF_DELIVERY_AREA: "Endereço fora da área de entrega.",
  EMPTY_CART: "Seu carrinho está vazio.",
  PRODUCT_UNAVAILABLE: "Um produto do carrinho não está mais disponível.",
  OUT_OF_STOCK: "Estoque insuficiente para um dos produtos.",
  VARIANT_REQUIRED: "Escolha uma opção para o produto.",
  INVALID_VARIANT: "Opção de produto inválida.",
  INVALID_ADDON: "Complemento inválido.",
  ADDON_MIN_NOT_MET: "Escolha os complementos obrigatórios.",
  ADDON_MAX_EXCEEDED: "Quantidade de complementos acima do permitido.",
  INVALID_QUANTITY: "Quantidade inválida.",
  BELOW_MINIMUM: "O pedido não atingiu o valor mínimo.",
  COUPON_INVALID: "Cupom inválido.",
  COUPON_EXPIRED: "Cupom expirado.",
  COUPON_LIMIT_REACHED: "Este cupom atingiu o limite de usos.",
  COUPON_CUSTOMER_LIMIT: "Você já usou este cupom o número máximo de vezes.",
  COUPON_MIN_ORDER: "O pedido não atingiu o valor mínimo para este cupom.",
  PAYMENT_METHOD_DISABLED: "Forma de pagamento indisponível.",
  RATE_LIMITED: "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente novamente.",
  INVALID_CUSTOMER: "Informe nome e telefone válidos.",
  PAYER_EMAIL_REQUIRED: "Informe seu e-mail para pagar com Pix.",
  INVALID_PAYLOAD: "Dados do pedido inválidos.",
  INVALID_CHANGE: "O troco deve ser para um valor maior ou igual ao total do pedido.",
  MEMBER_NOT_FOUND: "Membro não encontrado.",
  ORDER_NOT_FOUND: "Pedido não encontrado.",
  INVALID_TRANSITION: "Não é possível mudar o pedido para este status.",
  FORBIDDEN: "Você não tem permissão para esta ação.",
  NOT_AUTHENTICATED: "Faça login para continuar.",
  PAYMENT_NOT_FOUND: "Pagamento não encontrado.",
  PAYMENT_NOT_ALLOWED: "Operação de pagamento não permitida.",
  INVITE_INVALID: "Convite inválido ou expirado.",
  LAST_OWNER: "O restaurante precisa de pelo menos um proprietário.",
  SLUG_TAKEN: "Este endereço já está em uso.",
  INVALID_INPUT: "Dados inválidos.",
  UNKNOWN: "Algo deu errado. Tente novamente.",
};

function field(e: unknown, key: string): string | undefined {
  if (e && typeof e === "object" && key in e) {
    const v = (e as Record<string, unknown>)[key];
    return typeof v === "string" && v.trim() ? v : undefined;
  }
  return undefined;
}

export function parseMenzuError(e: unknown): { code: string; message: string } {
  const raw = field(e, "message") ?? (typeof e === "string" ? e : undefined) ?? "";
  const match = raw.match(/MENZU:([A-Z_]+)/);
  if (!match) return { code: "UNKNOWN", message: MENZU_ERROR_MESSAGES.UNKNOWN };
  const code = match[1];
  const detail = field(e, "details") ?? field(e, "detail");
  return { code, message: detail ?? MENZU_ERROR_MESSAGES[code] ?? MENZU_ERROR_MESSAGES.UNKNOWN };
}
