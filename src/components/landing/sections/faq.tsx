import { SectionHeading } from "./section-heading";
import styles from "../landing.module.css";

export function Faq() {
  return (
    <section className={styles.section} aria-labelledby="duvidas-title" id="duvidas">
      <div className={styles.container}>
        <SectionHeading id="duvidas-title" label="Dúvidas" title="Antes de começar." />
      </div>
    </section>
  );
}
