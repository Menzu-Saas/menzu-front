import Image from "next/image";
import { ImagePlaceholder } from "@/components/ui";
import { cn } from "@/lib/cn";

/** Product/cover photo or the striped placeholder (design-system §1.6). */
export function ProductImage({
  url,
  alt,
  kind = "food",
  label,
  className,
  sizes = "96px",
  priority = false,
}: {
  url: string | null;
  alt: string;
  kind?: "food" | "cover" | "off";
  label?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!url) return <ImagePlaceholder kind={kind} label={label} className={className} />;
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Uploaded images live on Supabase Storage (any host the restaurant used): served as-is. */}
      <Image src={url} alt={alt} fill unoptimized sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}
