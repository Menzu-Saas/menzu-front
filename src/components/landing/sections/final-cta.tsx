import { SectionHeading } from "./section-heading";
import styles from "../landing.module.css";

export function FinalCta(_props: { signupHref: string; exampleHref: string }) {
  return (
    <section className={styles.section} aria-labelledby="comecar-title" id="comecar">
      <div className={styles.container}>
        <SectionHeading id="comecar-title" label="Comece hoje" title="O próximo pedido começa aqui." />
      </div>
    </section>
  );
}
