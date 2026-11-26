"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bike, Check, PackageCheck, ShoppingBag, UtensilsCrossed } from "lucide-react";
import type { OrderStatus, OrderType } from "@/lib/order-status";

export function OrderProgress({ status, type, cancelReason }: { status: OrderStatus; type: OrderType; cancelReason: string | null }) {
  const router = useRouter();
  useEffect(() => {
    if (status === "DELIVERED" || status === "CANCELLED") return;
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, status]);

  const steps = [
    { label: "Recebido", icon: PackageCheck },
    { label: "Em preparo", icon: UtensilsCrossed },
    { label: type === "DELIVERY" ? "A caminho" : "Pronto", icon: type === "DELIVERY" ? Bike : ShoppingBag },
    { label: type === "DELIVERY" ? "Entregue" : "Concluído", icon: Check },
  ];
  const current = { PENDING: 0, CONFIRMED: 0, PREPARING: 1, READY: type === "DELIVERY" ? 1 : 2, OUT_FOR_DELIVERY: 2, DELIVERED: 3, CANCELLED: -1 }[status];
  return status === "CANCELLED" ? (cancelReason && <p className="break-words text-ink-muted">{cancelReason}</p>) :
      <ol aria-label="Progresso do pedido" className="grid grid-cols-4 gap-2">
        {steps.map(({ label, icon: Icon }, index) => <li key={label} aria-current={index === current ? "step" : undefined} className="min-w-0">
          <div className={`mb-3 h-1.5 rounded-full ${index <= current ? "bg-brand" : "bg-surface-sunken"}`} />
          <span aria-hidden="true" className={`grid size-10 place-items-center rounded-2xl ${index <= current ? "bg-brand-tint text-brand" : "bg-surface-sunken text-ink-muted"}`}>
            <Icon size={20} />
          </span>
          <p className={`mt-2 text-caption ${index === current ? "font-bold text-ink" : "text-ink-muted"}`}>{label}</p>
        </li>)}
      </ol>;
}
