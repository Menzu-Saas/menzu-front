import { Badge, type BadgeProps } from "./badge";

// Local until the domain types land in src/lib; later tasks re-point these imports.
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";

type Tone = NonNullable<BadgeProps["tone"]>;

export const ORDER_STATUS_BADGE: Record<OrderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "NOVO", tone: "brand" },
  CONFIRMED: { label: "CONFIRMADO", tone: "brand" },
  PREPARING: { label: "EM PREPARO", tone: "warning" },
  READY: { label: "PRONTO", tone: "success" },
  OUT_FOR_DELIVERY: { label: "EM ENTREGA", tone: "success" },
  DELIVERED: { label: "CONCLUÍDO", tone: "neutral" },
  CANCELLED: { label: "CANCELADO", tone: "danger" },
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "PENDENTE", tone: "warning" },
  PROCESSING: { label: "PROCESSANDO", tone: "info" },
  PAID: { label: "PAGO", tone: "success" },
  FAILED: { label: "FALHOU", tone: "danger" },
  REFUNDED: { label: "ESTORNADO", tone: "neutral" },
  CANCELLED: { label: "CANCELADO", tone: "neutral" },
};

interface StatusBadgeProps extends Omit<BadgeProps, "tone" | "children"> {
  status: OrderStatus;
  /** Appended after a middle dot, e.g. "19:42" → "NOVO · 19:42". */
  suffix?: string;
}

export function StatusBadge({ status, suffix, ...props }: StatusBadgeProps) {
  const { label, tone } = ORDER_STATUS_BADGE[status];
  return (
    <Badge tone={tone} {...props}>
      {suffix ? `${label} · ${suffix}` : label}
    </Badge>
  );
}

interface PaymentStatusBadgeProps extends Omit<BadgeProps, "tone" | "children"> {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status, ...props }: PaymentStatusBadgeProps) {
  const { label, tone } = PAYMENT_STATUS_BADGE[status];
  return (
    <Badge tone={tone} {...props}>
      {label}
    </Badge>
  );
}
