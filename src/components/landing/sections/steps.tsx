import { SectionHeading } from "./section-heading";
import styles from "../landing.module.css";

export function Steps(_props: { signupHref: string }) {
  return (
    <section className={styles.section} aria-labelledby="como-funciona-title" id="como-funciona">
      <div className={styles.container}>
        <SectionHeading id="como-funciona-title" label="Como funciona" title="Comece em três passos." />
      </div>
    </section>
  );
}
