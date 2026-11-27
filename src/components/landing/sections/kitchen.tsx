import { SectionHeading } from "./section-heading";
import styles from "../landing.module.css";

export function Kitchen() {
  return (
    <section className={styles.section} aria-labelledby="cozinha-title" id="cozinha">
      <div className={styles.container}>
        <SectionHeading id="cozinha-title" label="Cozinha" title="A cozinha no ritmo certo." />
      </div>
    </section>
  );
}
