import { cn } from "@/lib/cn";
import Image from "next/image";

type LogoSize = "sm" | "md" | "lg";

const TILE: Record<LogoSize, string> = {
  sm: "size-7.5",
  md: "size-8.5",
  lg: "size-11",
};

const WORDMARK: Record<LogoSize, string> = {
  sm: "text-subheading tracking-brand",
  md: "text-brand-title",
  lg: "text-display",
};

export interface LogoProps {
  size?: LogoSize;
  withWordmark?: boolean;
  className?: string;
}

/** Official Menzu symbol with optional wordmark. */
export function Logo({ size = "md", withWordmark = true, className }: LogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      {...(withWordmark ? {} : { role: "img", "aria-label": "Menzu" })}
    >
      <Image src="/menzu-logo.svg" alt="" width={44} height={44} className={cn("shrink-0 object-contain", TILE[size])} />
      {withWordmark && <span className={cn("font-extrabold text-ink", WORDMARK[size])}>Menzu</span>}
    </span>
  );
}
