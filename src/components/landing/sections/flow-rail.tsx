import { FLOW } from "../copy";
import { Reveal } from "../motion/reveal";
import styles from "../landing.module.css";

const DETAIL = ["Cardápio e checkout no celular do cliente", "Cozinha vê o pedido na hora", "Entregador sai com tudo certo", "Cliente acompanha até a porta"];

/** Thin band with the four stages; the line fills as it scrolls by (CSS scroll timeline, where supported). */
export function FlowRail() {
  return (
    <section aria-label="Do pedido à entrega" className={styles.flowRail}>
      <div className={styles.container}>
        <ol className={styles.flowList}>
          <span aria-hidden="true" className={styles.flowLine} />
          {FLOW.map((stage, index) => (
            <Reveal as="li" key={stage} delay={index}>
              <span className={styles.label}>{String(index + 1).padStart(2, "0")}</span>
              <strong className={styles.blockTitle}>{stage}</strong>
              <span className={styles.flowDetail}>{DETAIL[index]}</span>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
