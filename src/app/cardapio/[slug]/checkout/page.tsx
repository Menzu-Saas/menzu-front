import { redirectOldSlug } from "@/server/queries/old-slug";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { restaurantOpenState } from "@/lib/opening-hours";
import { getPublicRestaurant } from "@/server/queries/public-menu";
import { guestOrderingAvailable } from "@/server/guest-ordering";
import { buyerCpfStatus } from "@/server/queries/buyer-cpf";
import { checkoutPaymentMode } from "@/server/queries/checkout-payment-mode";
import { getPublicCoupons } from "@/server/queries/public-coupons";
export const metadata = { title: "Finalizar pedido", robots: { index: false } };
export default async function Checkout({params, searchParams}: {params: Promise<{slug:string}>; searchParams: Promise<{agendar?:string}>}) {
 const {slug}=await params; const {agendar}=await searchParams; const r=await getPublicRestaurant(slug); if(!r)return redirectOldSlug(slug,"/checkout",{agendar});
 const [cpf, publicCoupons, paymentMode] = await Promise.all([buyerCpfStatus(), getPublicCoupons(slug), checkoutPaymentMode(r.id)]);
 return <CheckoutView buyerId="guest" customer={null} cpf={cpf} publicCoupons={publicCoupons} restaurant={r} orderingAvailable={await guestOrderingAvailable()} openState={restaurantOpenState(r,r.hours,r.timezone,new Date())} paymentMode={paymentMode} preferSchedule={agendar==="1"}/>;
}
