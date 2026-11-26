"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { useFieldControlProps } from "./form-field";
import { Icon } from "./icon";
import { fieldShell } from "./input";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export interface SelectTriggerProps extends ComponentProps<typeof SelectPrimitive.Trigger> {
  size?: "md" | "lg";
  invalid?: boolean;
}

export function SelectTrigger({
  className,
  children,
  size = "md",
  invalid: invalidProp,
  id,
  "aria-describedby": ariaDescribedBy,
  ...props
}: SelectTriggerProps) {
  const field = useFieldControlProps({ id, invalid: invalidProp, "aria-describedby": ariaDescribedBy });
  const invalid = field.invalid;

  return (
    <SelectPrimitive.Trigger
      id={field.id}
      aria-invalid={field["aria-invalid"]}
      aria-describedby={field["aria-describedby"]}
      className={cn(
        fieldShell(size, invalid),
        "justify-between text-left outline-none focus-visible:outline-none",
        "focus:bg-surface focus:ring-1 focus:ring-inset",
        invalid ? "focus:border-danger focus:ring-danger" : "focus:border-accent focus:ring-accent",
        "disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:font-normal data-placeholder:text-ink-faint",
        "[&>span]:truncate",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-ink-ghost" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={sideOffset}
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden",
          "rounded-2xl border border-line bg-surface text-ink shadow-frame",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="flex flex-col gap-0.5 p-1.5">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label className={cn("eyebrow px-3 py-2 text-ink-faint", className)} {...props} />;
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md py-2.5 pr-9 pl-3 text-body-sm text-ink outline-none",
        "transition-colors duration-150 ease-out data-highlighted:bg-surface-muted",
        "data-[state=checked]:font-bold data-[state=checked]:text-brand",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex">
        <Icon icon={Check} size={16} active />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
