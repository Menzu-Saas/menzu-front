import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "../motion/reveal";
import styles from "../landing.module.css";

/** Closing: one large statement and the two ways forward. Light, no box. */
export function FinalCta({ signupHref, exampleHref }: { signupHref: string; exampleHref: string }) {
  return (
    <section className={styles.finalSection} id="comecar" aria-labelledby="comecar-title">
      <div className={styles.container}>
        <div className={styles.finalGrid}>
          <Reveal className={styles.finalTitleWrap}>
            <h2 id="comecar-title" className={styles.finalTitle}>O próximo pedido <em>começa aqui.</em></h2>
          </Reveal>
          <Reveal delay={1} className={styles.finalAside}>
            <p className={styles.lead}>Monte seu cardápio, convide a equipe e receba o primeiro pedido pelo celular do seu cliente.</p>
            <div className={styles.actions}>
              <Link href={signupHref} className={styles.button}>
                Criar meu restaurante <ArrowRight size={18} aria-hidden="true" className={styles.arrow} />
              </Link>
              <Link href={exampleHref} className={styles.textLink}>Ver um cardápio de exemplo</Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
