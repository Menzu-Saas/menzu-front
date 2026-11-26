"use client";

import { Check, Copy, CreditCard, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  method: "PIX" | "CARD_ONLINE";
  status: string;
  pixCode: string | null;
  pixImage: string | null;
  checkoutUrl: string | null;
  totalLabel: string;
};

/** Only Asaas' own https pages are opened from here. */
function safeCheckout(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "asaas.com" || u.hostname.endsWith(".asaas.com")) ? u.toString() : null;
  } catch { return null; }
}

/**
 * Pix QR code or the link to Asaas' card page for an order still waiting for payment. While it waits,
 * the page refreshes on its own so the buyer sees the confirmation that the webhook brings.
 */
export function OnlinePaymentBox({ method, status, pixCode, pixImage, checkoutUrl, totalLabel }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const waiting = status === "PENDING" || status === "PROCESSING";
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(id);
  }, [waiting, router]);

  if (status === "PAID") return <p role="status" className="rounded-3xl border border-brand-soft-border bg-brand-soft p-4 font-bold">Pagamento confirmado.</p>;
  if (status === "REFUNDED") return <p role="status" className="rounded-3xl border border-line p-4 font-bold">Pagamento estornado.</p>;
  if (!waiting) return null;

  const card = safeCheckout(checkoutUrl);
  if (method === "CARD_ONLINE") {
    return <section className="flex flex-col gap-3 rounded-3xl border border-brand-soft-border bg-brand-soft p-4">
      <h2 className="flex items-center gap-2 text-subheading"><CreditCard size={20} />Pague {totalLabel} com cartão</h2>
      {card ? <>
        <p className="text-body-sm text-ink-secondary">Você digita o cartão em uma página segura do Asaas. O Menzu não vê os dados do cartão.</p>
        <a href={card} rel="noreferrer noopener" className="flex min-h-12 items-center justify-center rounded-2xl bg-brand px-4 font-bold text-white focus-visible:outline-2 focus-visible:outline-accent">Pagar com cartão</a>
        <p className="text-caption text-ink-muted">Depois de pagar, volte para esta página: a confirmação aparece aqui.</p>
      </> : <p className="text-body-sm text-ink-secondary">Estamos gerando a página de pagamento. Atualize em instantes.</p>}
    </section>;
  }

  return <section className="flex flex-col gap-3 rounded-3xl border border-brand-soft-border bg-brand-soft p-4">
    <h2 className="flex items-center gap-2 text-subheading"><QrCode size={20} />Pague {totalLabel} com Pix</h2>
    {pixCode ? <>
      {pixImage && /^[A-Za-z0-9+/=]+$/.test(pixImage) && (
        // eslint-disable-next-line @next/next/no-img-element -- inline QR code returned by Asaas
        <img src={`data:image/png;base64,${pixImage}`} alt="QR Code do Pix" width={220} height={220} className="mx-auto rounded-2xl bg-white p-2" />
      )}
      <p className="text-body-sm text-ink-secondary">Abra o app do seu banco, escolha Pix e leia o QR Code, ou use o Pix copia e cola.</p>
      <button type="button" onClick={() => { void navigator.clipboard?.writeText(pixCode).then(() => setCopied(true)); }}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-4 font-bold text-white focus-visible:outline-2 focus-visible:outline-accent">
        {copied ? <><Check size={18} />Código copiado</> : <><Copy size={18} />Copiar código Pix</>}
      </button>
      <p className="break-all rounded-xl bg-surface p-3 font-mono text-caption text-ink-muted">{pixCode}</p>
    </> : <p className="text-body-sm text-ink-secondary">Estamos gerando o Pix. Atualize em instantes.</p>}
  </section>;
}
