"use client";

import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useFieldControlProps } from "./form-field";
import { Icon } from "./icon";

/** Field shell shared by Input and SelectTrigger: muted bg, 1px line; focus = 2px accent (border + inset ring, no layout shift). */
export const fieldShell = (size: "md" | "lg", invalid: boolean) =>
  cn(
    "group/field flex w-full items-center gap-2.5 border bg-surface-muted px-3.5 text-body text-ink",
    "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
    "focus-within:bg-surface focus-within:ring-1 focus-within:ring-inset",
    "has-disabled:cursor-not-allowed has-disabled:opacity-50",
    size === "lg" ? "h-12 rounded-2xl" : "h-11 rounded-lg",
    invalid
      ? "border-danger focus-within:border-danger focus-within:ring-danger"
      : "border-line focus-within:border-accent focus-within:ring-accent",
  );

export interface InputProps extends Omit<ComponentProps<"input">, "size"> {
  size?: "md" | "lg";
  leftIcon?: LucideIcon;
  rightSlot?: ReactNode;
  invalid?: boolean;
  wrapperClassName?: string;
}

export function Input({
  size = "md",
  leftIcon,
  rightSlot,
  invalid: invalidProp,
  className,
  wrapperClassName,
  id,
  required,
  "aria-describedby": ariaDescribedBy,
  ...props
}: InputProps) {
  const { invalid, ...aria } = useFieldControlProps({
    id,
    invalid: invalidProp,
    required,
    "aria-describedby": ariaDescribedBy,
  });

  return (
    <div className={cn(fieldShell(size, invalid), wrapperClassName)}>
      {leftIcon && (
        <Icon
          icon={leftIcon}
          size={size === "lg" ? 20 : 18}
          className="text-ink-disabled transition-colors duration-150 ease-out group-focus-within/field:text-accent"
        />
      )}
      <input
        {...aria}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none focus-visible:outline-none",
          "placeholder:font-normal placeholder:text-ink-faint disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
      {rightSlot}
    </div>
  );
}
