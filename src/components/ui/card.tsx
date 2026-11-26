import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const cardVariants = cva("border", {
  variants: {
    padding: {
      none: "",
      sm: "p-3.5",
      md: "p-4.5",
      lg: "p-5",
      xl: "p-6.5",
    },
    radius: {
      "3xl": "rounded-3xl",
      "4xl": "rounded-4xl",
      "6xl": "rounded-6xl",
    },
    tone: {
      surface: "border-line bg-surface",
      subtle: "border-line bg-surface-subtle",
      sunken: "border-line bg-surface-sunken",
      brand: "border-brand-soft-border bg-brand-tint",
      success: "border-success-border bg-success-tint",
    },
    interactive: {
      true: cn(
        "cursor-pointer transition-[border-color,transform] duration-150 ease-out hover:border-line-strong active:translate-y-px",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      ),
      false: "",
    },
    /** Top-level frame: frame border + warm card shadow. Cards inside a page have no shadow. */
    elevated: { true: "border-frame shadow-card", false: "" },
  },
  defaultVariants: { padding: "md", radius: "4xl", tone: "surface", interactive: false, elevated: false },
});

export interface CardProps extends ComponentProps<"div">, VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

export function Card({ className, padding, radius, tone, interactive, elevated, asChild, ...props }: CardProps) {
  const Comp = asChild ? Slot : "div";
  return <Comp className={cn(cardVariants({ padding, radius, tone, interactive, elevated }), className)} {...props} />;
}
