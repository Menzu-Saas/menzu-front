import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const RADIUS = {
  xs: "rounded-xs",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  "4xl": "rounded-4xl",
  full: "rounded-full",
} as const;

export interface SkeletonProps extends ComponentProps<"div"> {
  radius?: keyof typeof RADIUS;
}

export function Skeleton({ radius = "lg", className, ...props }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("motion-safe:animate-pulse bg-surface-muted", RADIUS[radius], className)} {...props} />;
}
