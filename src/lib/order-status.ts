// Order status machine mirror for the UI. The database (update_order_status) is the authority;
// this module only decides which buttons to show. Both read the same transition table.
import transitionsJson from "./order-transitions.json";

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TYPES = ["DELIVERY", "PICKUP", "DINE_IN"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const MEMBER_ROLES = ["OWNER", "MANAGER", "ATTENDANT", "KITCHEN", "DELIVERY"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

type TransitionTable = Record<OrderStatus, Partial<Record<OrderStatus, MemberRole[]>>>;
const TRANSITIONS = transitionsJson as TransitionTable;

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY: "Pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Retirada",
  DINE_IN: "Mesa",
};

/** Type rule: OUT_FOR_DELIVERY only for DELIVERY orders; READY→DELIVERED only for non-delivery orders. */
function typeAllows(from: OrderStatus, to: OrderStatus, type: OrderType): boolean {
  if (from === "READY" && to === "OUT_FOR_DELIVERY") return type === "DELIVERY";
  if (from === "READY" && to === "DELIVERED") return type !== "DELIVERY";
  return true;
}

export function canTransition(from: OrderStatus, to: OrderStatus, role: MemberRole, type: OrderType): boolean {
  const roles = TRANSITIONS[from]?.[to];
  return !!roles && roles.includes(role) && typeAllows(from, to, type);
}

export function allowedTransitions(from: OrderStatus, role: MemberRole, type: OrderType): OrderStatus[] {
  const targets = Object.keys(TRANSITIONS[from] ?? {}) as OrderStatus[];
  return targets.filter((to) => canTransition(from, to, role, type));
}

const PRIMARY_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "Aceitar pedido",
  PREPARING: "Iniciar preparo",
  READY: "Marcar como pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega",
};

/** The forward (non-cancel) action for the order card, or null when the role has none. */
export function nextPrimaryAction(
  order: { status: OrderStatus; type: OrderType },
  role: MemberRole,
): { to: OrderStatus; label: string } | null {
  const to = allowedTransitions(order.status, role, order.type).find((s) => s !== "CANCELLED");
  if (!to) return null;
  if (to === "DELIVERED") return { to, label: order.type === "DELIVERY" ? "Marcar entregue" : "Concluir" };
  return { to, label: PRIMARY_LABEL[to] ?? ORDER_STATUS_LABEL[to] };
}
