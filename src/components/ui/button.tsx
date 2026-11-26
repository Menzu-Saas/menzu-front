import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Shared interaction states (design-system §10). */
export const interactive =
  "transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] duration-150 ease-out " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "not-disabled:active:translate-y-px aria-disabled:active:translate-y-0 " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

export const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-sans",
    interactive,
  ),
  {
    variants: {
      variant: {
        primary: "bg-accent text-white not-disabled:hover:bg-brand",
        inverse: "bg-inverse text-white not-disabled:hover:bg-inverse-hover",
        success: "bg-success text-white not-disabled:hover:brightness-95",
        outline: "border border-line bg-surface text-ink not-disabled:hover:bg-surface-muted",
        ghost: "bg-transparent text-ink not-disabled:hover:bg-surface-muted",
        soft: "border border-brand-soft-border bg-brand-soft text-brand not-disabled:hover:bg-brand-badge",
        danger: "bg-danger text-white not-disabled:hover:brightness-95",
        /** White CTA on the orange brand gradient (reference promo hero "Pedir agora"). */
        white:
          "bg-surface text-brand not-disabled:hover:bg-brand-tint not-disabled:hover:text-accent focus-visible:outline-white",
      },
      size: {
        sm: "h-9 rounded-md px-3.5 text-caption font-bold",
        md: "h-11 rounded-lg px-4 text-body-sm font-bold",
        lg: "h-12.5 rounded-btn-lg px-5 text-body font-extrabold",
        xl: "h-13.5 rounded-2xl px-5 text-item font-extrabold",
      },
      block: { true: "w-full", false: "" },
    },
    compoundVariants: [
      { variant: "primary", size: "xl", className: "shadow-cta" },
      { variant: "success", size: "xl", className: "shadow-cta-success" },
    ],
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const inactive = Boolean(disabled || loading);
  const Comp = asChild ? Slot : "button";
  const spinnerSize = size === "sm" ? 14 : size === "md" || size == null ? 16 : 18;

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, block }), className)}
      aria-busy={loading || undefined}
      aria-disabled={inactive || undefined}
      {...(asChild ? {} : { type: type ?? "button", disabled: inactive })}
      {...props}
    >
      {loading && (
        <LoaderCircle
          data-spinner=""
          aria-hidden="true"
          size={spinnerSize}
          strokeWidth={2.1}
          className="shrink-0 animate-spin"
        />
      )}
      <Slottable>{children}</Slottable>
    </Comp>
  );
}
