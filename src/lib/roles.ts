import type { MemberRole } from "@/lib/order-status";

// Single source of the role lists used by page guards, server actions and navigation (spec §2 role matrix).

/** Dashboard, reports, catalog (menu, add-ons, coupons, delivery zones), QR codes, settings and team. */
export const MANAGEMENT_ROLES = ["OWNER", "MANAGER"] as const satisfies readonly MemberRole[];

/** Admin panel (/painel): orders and customers. */
export const SERVICE_ROLES = ["OWNER", "MANAGER", "ATTENDANT"] as const satisfies readonly MemberRole[];

/** Kitchen screen (/cozinha). */
export const KITCHEN_ROLES = ["OWNER", "MANAGER", "ATTENDANT", "KITCHEN"] as const satisfies readonly MemberRole[];

/** Delivery screen (/entregas). */
export const DELIVERY_ROLES = ["OWNER", "MANAGER", "ATTENDANT", "DELIVERY"] as const satisfies readonly MemberRole[];
