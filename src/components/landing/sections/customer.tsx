import { SectionHeading } from "./section-heading";
import styles from "../landing.module.css";

export function Customer() {
  return (
    <section className={styles.section} aria-labelledby="cliente-title" id="cliente">
      <div className={styles.container}>
        <SectionHeading id="cliente-title" label="Seu cliente" title="Pedir fica fácil." />
      </div>
    </section>
  );
}
