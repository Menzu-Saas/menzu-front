"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { useEffect } from "react";
import { Button, Icon } from "@/components/ui";

/** "Imprimir" + back link (hidden on paper). With `autoPrint`, opens the print dialog once fonts are ready. */
export function PrintControls({ autoPrint, backHref }: { autoPrint: boolean; backHref: string }) {
  useEffect(() => {
    if (!autoPrint) return;
    let cancelled = false;
    const ready = document.fonts?.ready ?? Promise.resolve();
    ready.then(() => {
      if (!cancelled) window.print();
    });
    return () => {
      cancelled = true;
    };
  }, [autoPrint]);

  return (
    <div className="mz-no-print flex flex-wrap items-center justify-center gap-2.5">
      <Button variant="outline" asChild>
        {/* Plain <a>: a full navigation, so nothing from the print page survives on the board. */}
        <a href={backHref}>
          <Icon icon={ArrowLeft} size={18} />
          Voltar ao pedido
        </a>
      </Button>
      <Button variant="inverse" onClick={() => window.print()}>
        <Icon icon={Printer} size={18} />
        Imprimir
      </Button>
    </div>
  );
}
