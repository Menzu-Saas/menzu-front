"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { useFieldControlProps } from "./form-field";

export interface TextareaProps extends ComponentProps<"textarea"> {
  invalid?: boolean;
}

export function Textarea({
  className,
  invalid: invalidProp,
  id,
  required,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextareaProps) {
  const { invalid, ...aria } = useFieldControlProps({
    id,
    invalid: invalidProp,
    required,
    "aria-describedby": ariaDescribedBy,
  });

  return (
    <textarea
      {...aria}
      className={cn(
        "min-h-18 w-full resize-y rounded-xl border bg-surface-sunken px-3.5 py-3 text-body-sm text-ink",
        "placeholder:font-normal placeholder:text-ink-faint",
        "transition-[border-color,box-shadow] duration-150 ease-out outline-none focus-visible:outline-none",
        "focus:ring-1 focus:ring-inset",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid ? "border-danger focus:border-danger focus:ring-danger" : "border-line focus:border-accent focus:ring-accent",
        className,
      )}
      {...props}
    />
  );
}
