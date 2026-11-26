import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/cn";

/** Inline form-level message: danger (errors) or success (e-mail sent). */
export function FormAlert({ tone = "danger", children }: { tone?: "danger" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-body-sm",
        tone === "danger" ? "border-danger-soft bg-danger-soft text-danger" : "border-success-border bg-success-tint text-ink",
      )}
    >
      <Icon
        icon={tone === "danger" ? CircleAlert : CircleCheck}
        size={18}
        className={cn("mt-px", tone === "success" && "text-success")}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
