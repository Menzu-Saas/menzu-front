import { ProductLanding } from "@/components/landing/product-landing";

export default function Home() {
  return <ProductLanding audience="restaurant" loginHref="/acessar" signupHref="/cadastro" loggedIn={false} exampleHref="/cardapio/burger-house" />;
}
