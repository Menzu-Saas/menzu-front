"use client";

import type { ReactNode } from "react";
import { MobileNav, NavList, Sidebar } from "@/components/ui";
import type { MemberRole } from "@/lib/order-status";
import { useRestaurantId } from "./current-restaurant";
import { navItemsFor, operationNavFor } from "./nav-items";
import { usePendingOrders } from "./use-pending-orders";

export interface AdminShellProps {
  role: MemberRole;
  /** Orders waiting for acceptance (badge on "Pedidos"). */
  pendingOrders: number;
  /** Logo tile + restaurant name (or the restaurant switcher). */
  brand: ReactNode;
  /** Store status card and account actions, pinned to the bottom of the sidebar / drawer. */
  footer: ReactNode;
  children: ReactNode;
}

/**
 * Admin layout (reference P1): 232px sidebar on lg+, mobile top bar + drawer below lg, white content
 * area with 26px padding (16px on mobile) inside the 1240px container.
 */
export function AdminShell({ role, pendingOrders, brand, footer, children }: AdminShellProps) {
  // Icons are components, so the nav is built here (client) from serialisable props.
  const pending = usePendingOrders(useRestaurantId(), pendingOrders);
  const items = navItemsFor(role, { orders: pending });
  const operation = operationNavFor(role);
  // Secondary "Operação" group (kitchen / delivery screens) sits above the store status card.
  const bottom = (
    <div className="flex flex-col gap-4">
      {operation.length > 0 && (
        <div role="group" aria-label="Operação" className="flex flex-col gap-1.5">
          <p aria-hidden="true" className="eyebrow px-3 text-ink-subtle">
            Operação
          </p>
          <NavList items={operation} />
        </div>
      )}
      {footer}
    </div>
  );
  return (
    <div className="flex w-full flex-1 bg-surface">
      <Sidebar
        brand={brand}
        items={items}
        footer={bottom}
        className="sticky top-0 hidden h-dvh overflow-y-auto lg:flex"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav items={items} brand={brand} footer={bottom} className="lg:hidden" />
        <main id="conteudo" className="mx-auto flex w-full max-w-container min-w-0 flex-1 flex-col p-4 lg:p-6.5">
          {children}
        </main>
      </div>
    </div>
  );
}
