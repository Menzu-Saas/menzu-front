"use client";

import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { SegmentedControl } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DASHBOARD_PERIODS, PERIOD_LABEL, type DashboardPeriod } from "@/lib/dashboard";

const OPTIONS = DASHBOARD_PERIODS.map((value) => ({ value, label: PERIOD_LABEL[value] }));

/** Period switch (Hoje / 7 dias / 30 dias) kept in the URL (`?periodo=`), so it survives reloads. */
export function PeriodControl({ value, className }: { value: DashboardPeriod; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [pending, startTransition] = useTransition();

  function change(next: DashboardPeriod) {
    startTransition(() => {
      setOptimistic(next);
      router.replace(next === "7d" ? pathname : `${pathname}?periodo=${next}`, { scroll: false });
    });
  }

  return (
    <SegmentedControl
      aria-label="Período"
      options={OPTIONS}
      value={optimistic}
      onChange={change}
      className={cn(pending && "opacity-80", className)}
    />
  );
}
