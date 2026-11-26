import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { interactive } from "./button";
import { Icon } from "./icon";

const iconButtonVariants = cva(cn("inline-flex shrink-0 items-center justify-center", interactive), {
  variants: {
    variant: {
      muted: "border border-line bg-surface-muted text-ink not-disabled:hover:border-line-strong",
      outline: "border border-line bg-surface text-ink not-disabled:hover:bg-surface-muted",
      soft: "border border-brand-soft-border bg-brand-soft text-brand not-disabled:hover:bg-brand-badge",
      accent: "bg-accent text-white not-disabled:hover:bg-brand",
    },
    size: {
      34: "size-8.5 rounded-lg",
      40: "size-10 rounded-xl",
      /** Touch target for one-handed ops screens (courier contact). */
      48: "size-12 rounded-2xl",
    },
  },
  defaultVariants: { variant: "muted", size: 40 },
});

const ICON_SIZE = { 34: 18, 40: 20, 48: 22 } as const;

export interface IconButtonProps extends Omit<ComponentProps<"button">, "aria-label"> {
  /** Accessible name (rendered as aria-label). */
  label: string;
  icon?: LucideIcon;
  size?: 34 | 40 | 48;
  variant?: "muted" | "outline" | "soft" | "accent";
  /** Render the single child element (e.g. an `<a>`) with icon-button styling; the icon goes inside it. */
  asChild?: boolean;
}

export function IconButton({
  label,
  icon,
  size = 40,
  variant = "muted",
  asChild = false,
  className,
  children,
  type = "button",
  disabled,
  ...props
}: IconButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      aria-label={label}
      title={label}
      aria-disabled={disabled || undefined}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type, disabled })}
      {...props}
    >
      {icon && <Icon icon={icon} size={ICON_SIZE[size]} />}
      {asChild ? <Slottable>{children}</Slottable> : !icon && children}
    </Comp>
  );
}
