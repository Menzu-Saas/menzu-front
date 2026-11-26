"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button, Icon, notify, type ButtonProps } from "@/components/ui";

/** Copies `value` to the clipboard and flips to "Copiado" for two seconds. */
export function CopyButton({
  value,
  label = "Copiar link",
  ...props
}: { value: string; label?: string } & Omit<ButtonProps, "onClick" | "children">) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copy} aria-live="polite" {...props}>
      <Icon icon={copied ? Check : Copy} size={16} className={copied ? "text-success" : undefined} />
      {copied ? "Copiado" : label}
    </Button>
  );
}
