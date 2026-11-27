import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { STEPS } from "../copy";
import { Reveal } from "../motion/reveal";
import styles from "../landing.module.css";

export function Steps({ signupHref }: { signupHref: string }) {
  return (
    <section className={styles.section} id="como-funciona" aria-labelledby="como-funciona-title">
      <div className={`${styles.container} ${styles.stepsGrid}`}>
        <Reveal className={styles.stepsIntro}>
          <p className={styles.label}>Como funciona</p>
          <h2 id="como-funciona-title" className={styles.chapterTitle}>Comece em <em>três passos.</em></h2>
          <p className={styles.lead}>Sem instalação e sem treinamento longo. Você configura a loja e já pode receber pedidos.</p>
          <Link href={signupHref} className={styles.button}>
            Criar meu restaurante <ArrowRight size={18} aria-hidden="true" className={styles.arrow} />
          </Link>
        </Reveal>
        <ol className={styles.stepsList}>
          {STEPS.map(([title, text], index) => (
            <Reveal as="li" key={title} delay={index} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3 className={styles.blockTitle}>{title}</h3>
                <p className={styles.body}>{text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
