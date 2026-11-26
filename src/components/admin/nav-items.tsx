import {
  Bike,
  Book,
  ChartNoAxesColumnIncreasing,
  ChefHat,
  CreditCard,
  ChartPie,
  Layers,
  List,
  QrCode,
  Settings,
  Tag,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/components/ui";
import type { MemberRole } from "@/lib/order-status";

import { MANAGEMENT_ROLES, SERVICE_ROLES } from "@/lib/roles";

export { MANAGEMENT_ROLES, SERVICE_ROLES };

export type NavKey =
  | "overview"
  | "orders"
  | "menu"
  | "addons"
  | "customers"
  | "coupons"
  | "delivery"
  | "reports"
  | "wallet"
  | "plan"
  | "team"
  | "qrcodes"
  | "settings";

export interface AdminNavEntry {
  key: NavKey;
  href: string;
  label: string;
  icon: LucideIcon;
  roles: readonly MemberRole[];
}

/** Every admin route, in sidebar order. Single source for the sidebar and the mobile drawer. */
export const ADMIN_NAV: readonly AdminNavEntry[] = [
  { key: "overview", href: "/painel", label: "Visão geral", icon: ChartNoAxesColumnIncreasing, roles: MANAGEMENT_ROLES },
  { key: "orders", href: "/painel/pedidos", label: "Pedidos", icon: List, roles: SERVICE_ROLES },
  { key: "menu", href: "/painel/cardapio", label: "Cardápio", icon: Book, roles: MANAGEMENT_ROLES },
  { key: "addons", href: "/painel/complementos", label: "Complementos", icon: Layers, roles: MANAGEMENT_ROLES },
  { key: "customers", href: "/painel/clientes", label: "Clientes", icon: Users, roles: SERVICE_ROLES },
  { key: "coupons", href: "/painel/cupons", label: "Cupons", icon: Tag, roles: MANAGEMENT_ROLES },
  { key: "delivery", href: "/painel/entrega", label: "Entrega", icon: Bike, roles: MANAGEMENT_ROLES },
  { key: "reports", href: "/painel/relatorios", label: "Relatórios", icon: ChartPie, roles: MANAGEMENT_ROLES },
  { key: "team", href: "/painel/equipe", label: "Equipe", icon: UserCog, roles: MANAGEMENT_ROLES },
  { key: "wallet", href: "/painel/carteira", label: "Carteira", icon: Wallet, roles: ["OWNER"] },
  { key: "plan", href: "/painel/plano", label: "Plano", icon: CreditCard, roles: ["OWNER"] },
  { key: "qrcodes", href: "/painel/qrcodes", label: "QR Codes", icon: QrCode, roles: MANAGEMENT_ROLES },
  { key: "settings", href: "/painel/configuracoes", label: "Configurações", icon: Settings, roles: MANAGEMENT_ROLES },
];

/**
 * Secondary "Operação" group: the dedicated kitchen and delivery screens (spec §2: OWNER, MANAGER and
 * ATTENDANT also run them). KITCHEN/DELIVERY never see the panel, so they never see this group.
 */
export const OPERATION_NAV: readonly Omit<AdminNavEntry, "key">[] = [
  { href: "/cozinha", label: "Cozinha", icon: ChefHat, roles: SERVICE_ROLES },
  { href: "/entregas", label: "Entregas", icon: Bike, roles: SERVICE_ROLES },
];

export function operationNavFor(role: MemberRole): NavItem[] {
  return OPERATION_NAV.filter((entry) => entry.roles.includes(role)).map(({ href, label, icon }) => ({ href, label, icon }));
}

/** Nav items visible to `role`, with optional counters (e.g. `{ orders: 3 }` pending orders). */
export function navItemsFor(role: MemberRole, badges: Partial<Record<NavKey, number>> = {}): NavItem[] {
  return ADMIN_NAV.filter((entry) => entry.roles.includes(role)).map(({ href, label, icon, key }) => ({
    href,
    label,
    icon,
    badge: badges[key],
  }));
}

export function canSeeDashboard(role: MemberRole): boolean {
  return (MANAGEMENT_ROLES as readonly MemberRole[]).includes(role);
}

