import Link from "next/link";
import { ArrowLeft, Bike, Clock3, MapPin, MessageCircle } from "lucide-react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { redirectOldSlug } from "@/server/queries/old-slug";
import { getOrderReviewState, getPublicOrder } from "@/server/queries/public-menu";
import { formatMoney } from "@/lib/money";
import { isUuid } from "@/lib/uuid";
import { OrderFeedback } from "@/components/orders/order-feedback";
import { OrderProgress } from "@/components/orders/order-progress";
import { PAYMENT_METHOD_LABEL } from "@/lib/order-board";
import { formatClock } from "@/lib/opening-hours";
import { getPublicRestaurant } from "@/server/queries/public-menu";
import { OnlinePaymentBox } from "@/components/orders/online-payment-box";
export const metadata={title:"Pedido enviado", robots:{index:false}, referrer:"no-referrer" as const};
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" as const };
export default async function Confirmation({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{id?:string}>}) {
 const {slug}=await params;
 const {id}=await searchParams;
 if(!isUuid(id))notFound();
 const token=(await cookies()).get(`menzu_receipt_${id}`)?.value;
 const order=token?await getPublicOrder(id,token):null;
 if(!order)notFound();
 if(order.restaurant.slug!==slug)return redirectOldSlug(slug,"/confirmacao",{id});
 const reviewState = token && (order.status === "DELIVERED" || (order.type === "DELIVERY" && order.status === "OUT_FOR_DELIVERY"))
   ? await getOrderReviewState(id, token) : "unavailable";
 const receivedByCustomer = order.type === "DELIVERY" && (reviewState === "ready" || reviewState === "reviewed");
 const status = receivedByCustomer ? "DELIVERED" : order.status;
 const restaurant = await getPublicRestaurant(slug);
 const timezone = restaurant?.timezone ?? "America/Sao_Paulo";
 const pay = order.payment;
 const onlinePayment = pay && (pay.method === "PIX" || pay.method === "CARD_ONLINE") && order.status !== "CANCELLED" ? pay : null;
 const clock = (value: string) => formatClock(value, timezone);
 const menu = "/cardapio/" + slug;
 const delivery = order.type === "DELIVERY";
 const active = status !== "DELIVERED" && status !== "CANCELLED";
 const title = {
   PENDING: "O restaurante está confirmando", CONFIRMED: "O restaurante confirmou seu pedido",
   PREPARING: "Seu pedido está em preparo", READY: delivery ? "Seu pedido está pronto" : order.type === "PICKUP" ? "Seu pedido está pronto para retirada" : "Seu pedido está pronto",
   OUT_FOR_DELIVERY: "Seu pedido saiu para entrega", DELIVERED: delivery ? "Seu pedido foi entregue" : "Seu pedido foi concluído",
   CANCELLED: "Pedido cancelado",
 }[status];
 const address = order.address;
 const street = [address?.street, address?.number].filter(Boolean).join(", ");
 const locality = [address?.neighborhood, address?.city, address?.state, address?.cep].filter(Boolean).join(" · ");
 const estimate = order.delivery_estimate;
 const validEstimate = estimate && Number.isFinite(Date.parse(estimate.earliest_at)) && Number.isFinite(Date.parse(estimate.latest_at));
 const phone = order.restaurant.whatsapp?.replace(/\D/g, "");
 const whatsapp = phone && (phone.length === 10 || phone.length === 11 ? "55" + phone : phone);
 const history = [
   ["Pedido recebido", order.created_at], ["Confirmado", order.confirmed_at],
   ["Em preparo", order.preparing_at], ["Pronto", order.ready_at],
   ["Saiu para entrega", order.out_for_delivery_at], [delivery ? "Entregue" : "Concluído", order.delivered_at],
   ["Cancelado", order.cancelled_at],
 ];
 const actionStyle = "flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line px-4 font-bold focus-visible:outline-2 focus-visible:outline-accent";
 return <main className="min-h-dvh bg-[#f1ece6] px-4 py-4 sm:px-6 lg:py-5">
   <div className="mx-auto max-w-[1600px]">
     <Link className={actionStyle + " mb-6 w-fit bg-surface"} href={menu}><ArrowLeft size={20} />Voltar</Link>
     <div className={`grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] ${reviewState === "awaiting_receipt" ? "lg:grid-rows-[auto_1fr]" : ""}`}>
       <section className={`flex min-w-0 flex-col gap-5 rounded-3xl border border-line bg-surface p-5 sm:p-7 ${reviewState === "awaiting_receipt" ? "lg:row-span-2" : ""}`}>
         <header>
           <p className="font-bold text-brand">Pedido #{order.number} · {order.restaurant.name}</p>
           <h1 aria-live="polite" className="mt-2 text-title-xl">{receivedByCustomer ? "Recebimento confirmado" : title}</h1>
         </header>
         {delivery && active && <section className="flex items-center gap-4 rounded-3xl border border-brand-soft-border bg-brand-soft p-4">
           <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface text-brand"><Clock3 size={24} /></span>
           <div><p className="text-caption font-bold text-ink-muted">Previsão de entrega</p>
             <p className="text-title-md">{validEstimate ? clock(estimate.earliest_at) + " – " + clock(estimate.latest_at) : "Previsão em atualização"}</p>
             {validEstimate && <p className="text-caption text-ink-muted">Estimativa da loja. Pode variar durante o preparo e a entrega.</p>}
           </div>
         </section>}
         {onlinePayment && <OnlinePaymentBox method={onlinePayment.method as "PIX" | "CARD_ONLINE"} status={onlinePayment.status} pixCode={onlinePayment.pix_qr_code} pixImage={onlinePayment.pix_qr_base64} checkoutUrl={onlinePayment.checkout_url} totalLabel={formatMoney(order.total_cents)} />}
         {pay && pay.status === "PAID" && order.status === "CANCELLED" && <p role="status" className="rounded-3xl border border-line p-4 text-body-sm">Pedido cancelado. O estorno do pagamento foi solicitado e pode levar alguns dias para aparecer.</p>}
         <OrderProgress status={status} type={order.type} cancelReason={order.cancel_reason} />
         {delivery && active && <section className="flex items-center gap-3 rounded-3xl border border-line p-4">
           <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><Bike size={24} /></span>
           <h2 className="text-subheading">{order.status === "OUT_FOR_DELIVERY" ? "Seu pedido está a caminho" : "Estamos organizando sua entrega"}</h2>
         </section>}
         {delivery && street && <section className="rounded-3xl border border-line p-4">
           <h2 className="flex items-center gap-2 text-subheading"><MapPin size={20} />Entregar em</h2>
           <p className="mt-2 break-words text-ink-secondary">{[street, address?.complement, locality].filter(Boolean).join(", ")}</p>
         </section>}
         <details className="rounded-3xl border border-line p-4">
           <summary className="cursor-pointer font-bold">Histórico do pedido</summary>
           <ol className="mt-3 space-y-2 text-body-sm text-ink-muted">
             {history.map(([label, time]) => time && <li key={label} className="flex justify-between gap-3"><span>{label}</span><time dateTime={time}>{clock(time)}</time></li>)}
           </ol>
         </details>
         <div className="grid gap-2 sm:flex">
           {whatsapp && <a className={actionStyle + " grow border-transparent bg-brand text-white"} href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Olá! Gostaria de falar sobre o pedido #" + order.number + ".")}`} target="_blank" rel="noreferrer"><MessageCircle size={20} />Falar no WhatsApp</a>}
           <Link className={actionStyle + " grow"} href={menu}>Ver cardápio</Link>
         </div>
       </section>
       <aside className="min-w-0 space-y-4 rounded-3xl border border-line bg-surface p-5 sm:p-6" aria-label="Resumo do pedido">
         <h2 className="text-subheading">Resumo do pedido</h2>
         <ul className="space-y-2">
           {order.items.map((item, index) => <li key={index} className="flex justify-between gap-3">
             <span className="min-w-0 break-words font-semibold">{item.quantity}× {item.product_name}{item.variant_name && " · " + item.variant_name}</span>
             <span className="shrink-0">{formatMoney(item.total_cents)}</span>
           </li>)}
         </ul>
         <dl className="space-y-2 border-y border-line py-3">
           <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotal_cents)}</dd></div>
           {delivery && <div className="flex justify-between"><dt>Entrega</dt><dd>{formatMoney(order.delivery_fee_cents)}</dd></div>}
           {order.discount_cents > 0 && <div className="flex justify-between"><dt>Desconto</dt><dd>−{formatMoney(order.discount_cents)}</dd></div>}
           <div className="flex justify-between text-subheading"><dt>Total</dt><dd>{formatMoney(order.total_cents)}</dd></div>
         </dl>
         <div><p className="text-caption font-bold uppercase text-ink-muted">Pagamento</p><p>{PAYMENT_METHOD_LABEL[order.payment_method]}</p></div>
         {delivery && street && <div><p className="text-caption font-bold uppercase text-ink-muted">Entregar em</p><p className="break-words">{street}</p><p className="text-caption text-ink-muted">{locality}</p></div>}
       </aside>
       {reviewState !== "unavailable" && <div className={reviewState === "awaiting_receipt" ? "lg:col-start-2 lg:row-start-2" : "lg:col-start-1"}><OrderFeedback orderId={id} initialState={reviewState} restaurant={order.restaurant.name} /></div>}
     </div>
   </div>
 </main>;
}
