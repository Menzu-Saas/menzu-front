"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Button, ResponsiveSheet } from "@/components/ui";
import { confirmOrderReceipt, submitOrderFeedback } from "@/server/actions/order-feedback";

type ReviewState = "unavailable" | "reviewed" | "awaiting_receipt" | "ready";
type Step = "restaurant" | "system";

export function OrderFeedback({ orderId, initialState, restaurant }: { orderId: string; initialState: ReviewState; restaurant: string }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [receiptOpen, setReceiptOpen] = useState(initialState === "awaiting_receipt");
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState("");
  const [confirming, startConfirming] = useTransition();
  const [message, action, pending] = useActionState(submitOrderFeedback.bind(null, orderId), "");
  const [ratings, setRatings] = useState({ restaurant: 0, system: 0 });
  const [comments, setComments] = useState({ restaurant: "", system: "" });

  function confirmReceipt() {
    setError("");
    startConfirming(async () => {
      try {
        const result = await confirmOrderReceipt(orderId);
        if (result === "ready" || result === "reviewed") {
          setState(result);
          setReceiptOpen(false);
          if (result === "ready") setStep("restaurant");
          router.refresh();
          return;
        }
      } catch { /* Keep the receipt button available for a retry. */ }
      setError("Não foi possível confirmar o recebimento. Tente novamente.");
    });
  }

  if (state === "unavailable") return null;
  if (state === "reviewed" || message === "ok") return <p role="status">Obrigado pela avaliação!</p>;
  return <section className={state === "awaiting_receipt" ? "" : "rounded-3xl border border-line bg-surface p-5"}>
    {state === "awaiting_receipt" ? <>
      {!receiptOpen && <div className="h-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:h-auto">
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:static lg:rounded-3xl lg:border lg:p-5">
          <Button block className="min-h-11" onClick={() => setReceiptOpen(true)}>Confirmar recebimento</Button>
        </div>
      </div>}
      <ResponsiveSheet open={receiptOpen} onOpenChange={(open) => { if (!confirming) setReceiptOpen(open); }}
        title="Seu pedido chegou?" description="Confirme quando estiver com o pedido em mãos.">
        <div className="grid gap-2">
          {error && <p role="alert" className="text-danger">{error}</p>}
          <Button loading={confirming} disabled={confirming} onClick={confirmReceipt}>Confirmar recebimento</Button>
          <Button variant="outline" disabled={confirming} onClick={() => setReceiptOpen(false)}>Agora não</Button>
        </div>
      </ResponsiveSheet>
    </> : <Button onClick={() => setStep("restaurant")}>Avaliar pedido</Button>}
    {step && <ResponsiveSheet key={step} open onOpenChange={(open) => { if (!open && !pending) setStep(null); }}
      title={step === "restaurant" ? "Como foi seu pedido?" : "Como foi usar o Menzu?"}
      description={step === "restaurant" ? restaurant : "Avalie a experiência de fazer seu pedido."}>
      <form action={action} className="flex flex-col gap-4">
        <fieldset className="flex justify-center gap-1 sm:gap-2">
          <legend className="sr-only">Escolha uma nota</legend>
          {[1, 2, 3, 4, 5].map((stars) => <label key={stars} className="grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-xl has-focus-visible:outline-2 has-focus-visible:outline-accent">
            <input type="radio" name="rating" className="sr-only" checked={ratings[step] === stars}
              onChange={() => setRatings((current) => ({ ...current, [step]: stars }))} aria-label={`${stars} de 5 estrelas`} />
            <Star aria-hidden="true" size={30} className={ratings[step] >= stars ? "fill-brand text-brand" : "text-ink-muted"} />
          </label>)}
        </fieldset>
        <label className="flex flex-col gap-2 text-body-sm">Comentário (opcional)
          <textarea value={comments[step]} maxLength={500} rows={3} className="rounded-xl border border-line p-3"
            onChange={(event) => setComments((current) => ({ ...current, [step]: event.target.value }))} />
        </label>
        {step === "restaurant" ? <Button type="button" disabled={!ratings.restaurant} onClick={() => setStep("system")}>Continuar</Button> : <>
          <input type="hidden" name="restaurant" value={ratings.restaurant} />
          <input type="hidden" name="system" value={ratings.system} />
          <input type="hidden" name="restaurantComment" value={comments.restaurant} />
          <input type="hidden" name="systemComment" value={comments.system} />
          {message && <p role="alert">{message}</p>}
          <Button type="submit" loading={pending} disabled={pending || !ratings.restaurant || !ratings.system}>Enviar avaliações</Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => setStep("restaurant")}>Voltar</Button>
        </>}
      </form>
    </ResponsiveSheet>}
  </section>;
}
