import { Check, ChevronLeft, MapPin, QrCode, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { DEMO_DISHES, DEMO_RESTAURANT, formatPrice } from "../copy";
import { Reveal } from "../motion/reveal";
import { SectionHeading } from "./section-heading";
import base from "../demos/demos.module.css";
import phone from "../demos/customer-phones.module.css";
import styles from "../landing.module.css";

const [lasanha, nhoque] = [DEMO_DISHES[0]!, DEMO_DISHES[1]!];
const DELIVERY = 800;
const total = lasanha.priceCents + nhoque.priceCents + DELIVERY;

function Bar({ title }: { title: string }) {
  return <div className={phone.bar}><ChevronLeft size={16} /><strong>{title}</strong></div>;
}

const SCREENS: { title: string; text: string; screen: ReactNode }[] = [
  {
    title: "Cardápio",
    text: "A loja, as ofertas e os pratos, feitos para o celular.",
    screen: (
      <>
        <div className={phone.cover}><span>{DEMO_RESTAURANT.slice(0, 1)}</span></div>
        <div className={phone.content}>
          <strong className={phone.name}>{DEMO_RESTAURANT}</strong>
          <span className={phone.meta}>Aberto · entrega 30–40 min</span>
          {DEMO_DISHES.slice(0, 3).map((dish) => (
            <div key={dish.name} className={phone.dishRow}>
              <span className={`${base.dish} ${phone.thumb}`} data-tone={dish.tone} />
              <span><b>{dish.name}</b><em>{formatPrice(dish.priceCents)}</em></span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    title: "Sacola",
    text: "Quantidades, cupom e total antes de seguir.",
    screen: (
      <>
        <Bar title="Sua sacola" />
        <div className={phone.content}>
          {[lasanha, nhoque].map((dish) => (
            <div key={dish.name} className={phone.dishRow}>
              <span className={`${base.dish} ${phone.thumb}`} data-tone={dish.tone} />
              <span><b>1× {dish.name}</b><em>{formatPrice(dish.priceCents)}</em></span>
            </div>
          ))}
          <div className={phone.line}><span>Entrega</span><span>{formatPrice(DELIVERY)}</span></div>
          <div className={`${phone.line} ${phone.total}`}><span>Total</span><span>{formatPrice(total)}</span></div>
          <span className={phone.cta}><ShoppingBag size={14} />Continuar</span>
        </div>
      </>
    ),
  },
  {
    title: "Checkout",
    text: "Dados, endereço e pagamento em uma tela, sem aplicativo.",
    screen: (
      <>
        <Bar title="Finalizar pedido" />
        <div className={phone.content}>
          <div className={phone.field}><MapPin size={14} /><span><b>Entrega</b><em>Rua das Flores, 100</em></span></div>
          <div className={`${phone.field} ${phone.selected}`}><QrCode size={14} /><span><b>Pix</b><em>Pague pelo app do banco</em></span></div>
          <div className={`${phone.line} ${phone.total}`}><span>Total</span><span>{formatPrice(total)}</span></div>
          <span className={phone.cta}>Confirmar pedido</span>
        </div>
      </>
    ),
  },
  {
    title: "Acompanhe",
    text: "O cliente vê cada etapa até a entrega.",
    screen: (
      <>
        <Bar title="Pedido #0142" />
        <div className={phone.content}>
          <strong className={phone.name}>Saiu para entrega</strong>
          <span className={phone.meta}>Chega entre 19:40 e 19:50</span>
          <ol className={phone.timeline}>
            {["Recebido", "Em preparo", "Saiu para entrega", "Entregue"].map((stage, index) => (
              <li key={stage} data-done={index < 3}>{index < 3 && <Check size={11} strokeWidth={3} />}{stage}</li>
            ))}
          </ol>
        </div>
      </>
    ),
  },
];

export function Customer() {
  return (
    <section className={styles.section} id="cliente" aria-labelledby="cliente-title">
      <div className={styles.container}>
        <SectionHeading id="cliente-title" label="Seu cliente" title={<>Pedir fica fácil. <em>Sem baixar nada.</em></>}>
          Do cardápio à entrega, tudo acontece no navegador do celular. O cliente escolhe, paga e acompanha.
        </SectionHeading>
      </div>
      <ul aria-label="Telas do cliente" className={styles.phoneRail}>
        {SCREENS.map((item, index) => (
          <Reveal as="li" key={item.title} delay={index} className={styles.phoneItem}>
            <div className={base.stage} aria-hidden="true">
              <div className={`${base.phone} ${phone.device}`}>
                <div className={`${base.screen} ${phone.screen}`}>
                  <span className={base.notch} />
                  {item.screen}
                </div>
              </div>
            </div>
            <h3 className={styles.blockTitle}>{item.title}</h3>
            <p className={styles.body}>{item.text}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
