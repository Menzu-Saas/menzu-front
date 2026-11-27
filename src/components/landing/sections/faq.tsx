import { Plus } from "lucide-react";
import { FAQ } from "../copy";
import { Reveal } from "../motion/reveal";
import styles from "../landing.module.css";

export function Faq() {
  return (
    <section className={styles.section} id="duvidas" aria-labelledby="duvidas-title">
      <div className={`${styles.container} ${styles.faqGrid}`}>
        <Reveal className={styles.faqIntro}>
          <p className={styles.label}>Dúvidas</p>
          <h2 id="duvidas-title" className={styles.chapterTitle}>Antes de começar.</h2>
        </Reveal>
        <Reveal delay={1} className={styles.faqList}>
          {FAQ.map(([question, answer]) => (
            <details key={question} className={styles.faqItem}>
              <summary>{question}<Plus size={18} aria-hidden="true" className={styles.faqIcon} /></summary>
              <p className={styles.body}>{answer}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
