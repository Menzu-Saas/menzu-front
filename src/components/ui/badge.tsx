import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-sm text-micro font-extrabold", {
  variants: {
    tone: {
      brand: "bg-brand-badge text-brand",
      success: "bg-success-soft text-success",
      warning: "bg-warning-soft text-warning",
      neutral: "bg-neutral-badge text-ink-secondary",
      danger: "bg-danger-soft text-danger",
      /* No blue in the palette: "info" is the soft brand pair. */
      info: "bg-brand-soft text-brand",
    },
    size: {
      sm: "px-2 py-1",
      md: "px-2.5 py-1.5",
    },
  },
  defaultVariants: { tone: "neutral", size: "md" },
});

export interface BadgeProps extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

/** Status/tag badge: 11/800, radius 9. Status labels are written uppercase by the caller. */
export function Badge({ tone, size, className, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}
