import type { ReactNode } from "react";
import { CheckoutDemo } from "../demos/checkout-demo";
import { MenuColorDemo } from "../demos/menu-color-demo";
import { OrderStatusDemo } from "../demos/order-status-demo";
import { RouteDemo } from "../demos/route-demo";
import { Reveal } from "../motion/reveal";
import { SectionHeading } from "./section-heading";
import styles from "../landing.module.css";

function Feature({ title, text, wide, delay, children }: { title: string; text: string; wide?: boolean; delay: number; children: ReactNode }) {
  return (
    <Reveal delay={delay} className={wide ? styles.featureWide : styles.featureNarrow}>
      <article className={styles.feature}>
        <div className={styles.featureText}>
          <h3 className={styles.blockTitle}>{title}</h3>
          <p className={styles.body}>{text}</p>
        </div>
        <div className={styles.featureStage}>{children}</div>
      </article>
    </Reveal>
  );
}

export function Features() {
  return (
    <section className={styles.section} id="recursos" aria-labelledby="recursos-title">
      <div className={styles.container}>
        <SectionHeading id="recursos-title" label="Recursos" title={<>Tudo no seu lugar, <em>do cardápio à entrega.</em></>}>
          Cada parte do Menzu conversa com a outra. O que o cliente escolhe chega à cozinha e segue até a porta dele.
        </SectionHeading>
        <div className={styles.featureGrid}>
          <Feature wide delay={0} title="Um cardápio com a cara da sua loja" text="Escolha a cor do seu restaurante e o cardápio inteiro acompanha. Experimente:">
            <MenuColorDemo />
          </Feature>
          <Feature delay={1} title="Pedidos em um só lugar" text="Cada pedido mostra em que etapa está, para a equipe inteira.">
            <OrderStatusDemo />
          </Feature>
          <Feature delay={0} title="Checkout sem aplicativo" text="Pix, cartão ou dinheiro, direto no navegador do celular.">
            <CheckoutDemo />
          </Feature>
          <Feature wide delay={1} title="Entrega acompanhada" text="A loja e o cliente veem o pedido sair, andar e chegar.">
            <RouteDemo />
          </Feature>
        </div>
      </div>
    </section>
  );
}
