import { cn } from "@/lib/cn";

/**
 * Renders SVG markup produced by `qrSvg` (the `qrcode` library from a URL we build; no user HTML),
 * scaled to its container.
 */
export function QrImage({ svg, label, className }: { svg: string; label: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("aspect-square [&>svg]:block [&>svg]:size-full", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
