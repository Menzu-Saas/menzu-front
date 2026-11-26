import type { ReactNode } from "react";
import { canSeeDashboard } from "@/components/admin/nav-items";
import { AdminShell } from "@/components/admin/admin-shell";
import { CurrentRestaurantProvider } from "@/components/admin/current-restaurant";
import { RestaurantSwitcher } from "@/components/admin/restaurant-switcher";
import { StoreStatusCard } from "@/components/admin/store-status-card";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { storeHoursInfo } from "@/lib/dashboard";
import { ADMIN_ROLES } from "@/lib/role-home";
import { getMemberships, requireMember } from "@/server/auth";
import { countPendingOrders, getRestaurantClock } from "@/server/queries/dashboard";

/** Admin shell for every /painel route: OWNER, MANAGER and ATTENDANT (others go to their own home). */
export default async function PainelLayout({ children }: { children: ReactNode }) {
  const { restaurantId, role, restaurant } = await requireMember(ADMIN_ROLES);
  const [memberships, pendingOrders, clock] = await Promise.all([
    getMemberships(),
    countPendingOrders(restaurantId),
    getRestaurantClock(restaurantId),
  ]);
  const hours = storeHoursInfo(clock.hours, new Date(), clock.timezone);

  const brand = (
    <RestaurantSwitcher
      currentId={restaurantId}
      restaurants={memberships.filter(({ role }) => role !== "DELIVERY").map((m) => ({ id: m.restaurant_id, name: m.restaurant.name, role: m.role }))}
    />
  );

  const footer = (
    <div className="flex flex-col gap-2.5">
      <StoreStatusCard
        status={restaurant.status}
        withinHours={hours.withinHours}
        detail={hours.detail}
        canChange={canSeeDashboard(role)}
      />
      <SignOutButton variant="ghost" size="sm" className="w-full justify-start px-3 text-ink-secondary" />
    </div>
  );

  return (
    <CurrentRestaurantProvider restaurantId={restaurantId}>
      <AdminShell role={role} pendingOrders={pendingOrders} brand={brand} footer={footer}>
        {children}
      </AdminShell>
    </CurrentRestaurantProvider>
  );
}
