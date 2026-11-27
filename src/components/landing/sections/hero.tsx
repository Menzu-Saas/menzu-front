import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "../motion/reveal";
import styles from "../landing.module.css";

export function Hero({ signupHref, exampleHref, demo }: { signupHref: string; exampleHref: string; demo?: ReactNode }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <p className={styles.label}><span className={styles.dot} aria-hidden="true" />Menzu para restaurantes</p>
          <h1 id="hero-title" className={styles.display}>
            Seu restaurante pronto para o <em>próximo pedido.</em>
          </h1>
          <p className={styles.lead}>
            Cardápio digital, pedidos, cozinha e entrega conectados. Seu cliente pede pelo celular, sem aplicativo, e a equipe acompanha tudo na mesma tela.
          </p>
          <div className={styles.actions}>
            <Link href={signupHref} className={styles.button}>
              Criar meu restaurante <ArrowRight size={18} aria-hidden="true" className={styles.arrow} />
            </Link>
            <Link href={exampleHref} className={styles.textLink}>Ver um cardápio de exemplo</Link>
          </div>
        </div>
        <Reveal delay={2} className={styles.heroDemo}>
          <figure>
            {demo}
            <figcaption className={styles.caption}>Telas ilustrativas</figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
