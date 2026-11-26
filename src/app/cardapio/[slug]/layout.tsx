import { restaurantThemeCss } from "@/lib/restaurant-theme";
import { getPublicRestaurant } from "@/server/queries/public-menu";

/** Páginas do cliente (cardápio, sacola, checkout e confirmação) na cor escolhida pelo restaurante. */
export default async function CardapioLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // A página decide o que fazer com erro ou endereço antigo; aqui, sem restaurante, fica o tema padrão.
  const restaurant = await getPublicRestaurant(slug).catch(() => null);
  const css = restaurantThemeCss(restaurant?.primaryColor);
  return (
    <>
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      {children}
    </>
  );
}
