import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CartView } from "@/components/cart/cart-view";
import { restaurantOpenState } from "@/lib/opening-hours";
import { getPublicMenu } from "@/server/queries/public-menu";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicMenu(slug);
  return { title: data ? `Carrinho · ${data.restaurant.name}` : "Carrinho", robots: { index: false } };
}

export default async function CartPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicMenu(slug);
  if (!data) notFound();
  const r = data.restaurant;
  return <CartView data={data} openState={restaurantOpenState(r, r.hours, r.timezone, new Date())} />;
}
