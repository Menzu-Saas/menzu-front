"use client";

import type { LucideIcon } from "lucide-react";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Drawer } from "./drawer";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { Logo } from "./logo";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Counter (e.g. new orders). Hidden when 0 or undefined. */
  badge?: number;
}

/** "/painel" (the dashboard root) matches exactly; every other item also matches its sub-routes. */
export function isNavItemActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/painel") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Vertical nav list: item r12 p11×12, 13/600 secondary; active brand-soft bg, brand 700, icon stroke 2.1. */
export function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isNavItemActive(item.href, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.75 text-body-sm transition-colors duration-150 ease-out",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active
                  ? "bg-brand-soft font-bold text-brand hover:text-brand"
                  : "text-ink-secondary hover:bg-surface-muted hover:text-ink",
              )}
            >
              <Icon icon={item.icon} size={18} active={active} className={active ? undefined : "text-ink-subtle"} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <>
                  {/* aria-label on a plain span is ignored by most screen readers: use sr-only text. */}
                  <span
                    aria-hidden="true"
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-micro font-extrabold text-white tabular-nums"
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                  <span className="sr-only">, {item.badge} novos</span>
                </>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export interface SidebarProps {
  brand: ReactNode;
  items: NavItem[];
  footer?: ReactNode;
  className?: string;
}

/** Admin sidebar (reference dashboard): w232, surface-subtle, right border, padding 22×18, gap 22. */
export function Sidebar({ brand, items, footer, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex w-58 shrink-0 flex-col gap-5.5 border-r border-line bg-surface-subtle px-4.5 py-5.5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">{brand}</div>
      <nav aria-label="Menu principal">
        <NavList items={items} />
      </nav>
      {footer && <div className="mt-auto">{footer}</div>}
    </aside>
  );
}

export interface MobileNavProps {
  items: NavItem[];
  /** Drawer header content; defaults to the Menzu logo. */
  brand?: ReactNode;
  footer?: ReactNode;
  /** Extra content on the right of the top bar (before the menu button). */
  actions?: ReactNode;
  className?: string;
}

/** Mobile top bar (logo + menu button) opening a left Drawer with the same nav items. */
export function MobileNav({ items, brand, footer, actions, className }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 flex h-15 items-center gap-3 border-b border-line bg-surface-subtle px-4",
          className,
        )}
      >
        <Logo size="sm" />
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <IconButton label="Abrir menu" icon={Menu} aria-expanded={open} onClick={() => setOpen(true)} />
        </div>
      </header>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        side="left"
        width="sm"
        title="Menu"
        header={brand ?? <Logo size="sm" />}
        className="bg-surface-subtle"
      >
        <nav aria-label="Menu principal" className="flex h-full flex-col gap-5.5">
          <NavList items={items} onNavigate={() => setOpen(false)} />
          {footer && <div className="mt-auto">{footer}</div>}
        </nav>
      </Drawer>
    </>
  );
}
