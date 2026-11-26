"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Icon,
  Logo,
  notify,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { MemberRole } from "@/lib/order-status";
import { homeForRole } from "@/lib/role-home";
import { setCurrentRestaurant } from "@/server/current-restaurant";
import { safely } from "@/components/admin/safely";

export interface SwitcherRestaurant {
  id: string;
  name: string;
  role: MemberRole;
}

export interface RestaurantSwitcherProps {
  currentId: string;
  restaurants: SwitcherRestaurant[];
  className?: string;
}

function Brand({ name }: { name: string }) {
  return (
    <>
      <Logo size="sm" withWordmark={false} />
      <span className="min-w-0 flex-1 truncate text-left text-body font-extrabold text-ink">{name}</span>
    </>
  );
}

/** Sidebar brand (reference P1: logo tile + restaurant name). Becomes a menu when the user has several restaurants. */
export function RestaurantSwitcher({ currentId, restaurants, className }: RestaurantSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = restaurants.find((r) => r.id === currentId) ?? restaurants[0];
  const name = current?.name ?? "";

  if (restaurants.length <= 1) {
    return (
      <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", className)}>
        <Brand name={name} />
      </div>
    );
  }

  function select(target: SwitcherRestaurant) {
    if (target.id === currentId) return;
    startTransition(safely(async () => {
      const result = await setCurrentRestaurant(target.id);
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      router.push(homeForRole(target.role));
      router.refresh();
    }));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${name}. Trocar restaurante`}
        aria-busy={pending || undefined}
        disabled={pending}
        className={cn(
          "-m-1.5 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 transition-colors duration-150 ease-out hover:bg-surface-muted disabled:opacity-60",
          className,
        )}
      >
        <Brand name={name} />
        <Icon icon={ChevronsUpDown} size={16} className="text-ink-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Seus restaurantes</DropdownMenuLabel>
        {restaurants.map((r) => (
          <DropdownMenuItem key={r.id} onSelect={() => select(r)} aria-current={r.id === currentId || undefined}>
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            {r.id === currentId && <Icon icon={Check} size={16} className="text-brand" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
