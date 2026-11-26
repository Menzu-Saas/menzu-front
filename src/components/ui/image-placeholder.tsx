import { cn } from "@/lib/cn";

type Kind = "food" | "cover" | "map" | "off";

const KIND: Record<Kind, string> = {
  food: "mz-stripes-food text-stripe-food-ink",
  cover: "mz-stripes-cover text-stripe-cover-ink",
  map: "mz-stripes-map text-stripe-map-ink",
  off: "mz-stripes-off text-stripe-off-ink",
};

export interface ImagePlaceholderProps {
  kind: Kind;
  label?: string;
  className?: string;
}

/** Diagonal-stripe stand-in for a missing image, with a DM Mono label (design-system §1.6). */
export function ImagePlaceholder({ kind, label, className }: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label ?? "Sem imagem"}
      className={cn("flex items-center justify-center overflow-hidden", KIND[kind], className)}
    >
      {label && <span className="px-2 text-center font-mono text-placeholder uppercase">{label}</span>}
    </div>
  );
}
