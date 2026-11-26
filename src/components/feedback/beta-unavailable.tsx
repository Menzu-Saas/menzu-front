import { Button } from "@/components/ui";
import { BETA_UNAVAILABLE } from "@/lib/beta-unavailable";
export function BetaUnavailable({ title, description }: { title: string; description?: string }) {
  return <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-muted p-5"><h2 className="text-subheading">{title}</h2><p role="status" className="text-body-sm text-ink-muted">{description ?? BETA_UNAVAILABLE}</p><Button disabled variant="outline">Indisponível na BETA</Button></section>;
}
