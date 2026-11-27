import { SectionHeading } from "./section-heading";
import styles from "../landing.module.css";

export function FlowRail() {
  return (
    <section className={styles.section} aria-labelledby="fluxo-title" id="fluxo">
      <div className={styles.container}>
        <SectionHeading id="fluxo-title" label="Do início ao fim" title="Um pedido, quatro etapas." />
      </div>
    </section>
  );
}
