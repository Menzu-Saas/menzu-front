"use client";

import { Download, Printer } from "lucide-react";
import { Button, Icon, notify } from "@/components/ui";
import { qrPngDataUrl } from "@/lib/qr";

function trigger(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export interface QrActionsProps {
  url: string;
  svg: string;
  /** File name without extension, e.g. "cardapio-burger-house". */
  filename: string;
  printHref?: string;
  compact?: boolean;
}

/** Download SVG / PNG (generated in the browser) and optional print link. */
export function QrActions({ url, svg, filename, printHref, compact = false }: QrActionsProps) {
  function downloadSvg() {
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    trigger(blobUrl, `${filename}.svg`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  async function downloadPng() {
    try {
      trigger(await qrPngDataUrl(url), `${filename}.png`);
    } catch {
      notify.error("Não foi possível gerar o PNG.");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={downloadSvg}>
        <Icon icon={Download} size={16} />
        SVG
      </Button>
      <Button variant="outline" size="sm" onClick={downloadPng}>
        <Icon icon={Download} size={16} />
        PNG
      </Button>
      {printHref && (
        <Button asChild variant={compact ? "outline" : "inverse"} size="sm">
          <a href={printHref}>
            <Icon icon={Printer} size={16} />
            Imprimir
          </a>
        </Button>
      )}
    </div>
  );
}
