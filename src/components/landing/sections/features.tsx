import { SectionHeading } from "./section-heading";
import styles from "../landing.module.css";

export function Features() {
  return (
    <section className={styles.section} aria-labelledby="recursos-title" id="recursos">
      <div className={styles.container}>
        <SectionHeading id="recursos-title" label="Recursos" title="Tudo no seu lugar." />
      </div>
    </section>
  );
}
