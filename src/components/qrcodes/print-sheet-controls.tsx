"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { Button, Icon } from "@/components/ui";

/** Back link + "Imprimir" above the A4 sheet (hidden on paper). */
export function PrintSheetControls({ count }: { count: number }) {
  return (
    <div className="mz-no-print flex w-full max-w-200 flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col">
        <h1 className="text-title-xl text-ink">Folha de QR Codes</h1>
        <p className="text-body-sm font-normal text-ink-muted">
          {count} {count === 1 ? "código" : "códigos"} · A4, 12 por página. Recorte nas linhas tracejadas.
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button variant="outline" asChild>
          {/* Full navigation, so the print rules never survive on the QR page. */}
          <a href="/painel/qrcodes">
            <Icon icon={ArrowLeft} size={18} />
            Voltar
          </a>
        </Button>
        <Button variant="inverse" onClick={() => window.print()}>
          <Icon icon={Printer} size={18} />
          Imprimir
        </Button>
      </div>
    </div>
  );
}
