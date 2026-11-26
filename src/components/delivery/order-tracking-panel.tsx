import type { DeliveryOrder } from "@/lib/delivery";
import { BetaUnavailable } from "@/components/feedback/beta-unavailable";
export function OrderTrackingPanel({ order }: { order: DeliveryOrder }) { return <BetaUnavailable title={"GPS do pedido #" + order.number} />; }
