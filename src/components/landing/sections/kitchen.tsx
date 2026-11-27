import { KitchenBoardDemo } from "../demos/kitchen-board-demo";
import { Reveal } from "../motion/reveal";
import styles from "../landing.module.css";

const POINTS = [
  ["Pedidos por etapa", "A preparar, em preparo e prontos, sem papel nem grito."],
  ["Tempo à vista", "Cada pedido mostra há quanto tempo está na fila."],
  ["Atualiza sozinho", "Pedido novo aparece na tela da cozinha na hora."],
];

/** Kitchen chapter on a warm band (light, per the owner's feedback). */
export function Kitchen() {
  return (
    <section className={`${styles.section} ${styles.band}`} id="cozinha" aria-labelledby="cozinha-title">
      <div className={`${styles.container} ${styles.kitchenGrid}`}>
        <Reveal className={styles.kitchenCopy}>
          <p className={styles.label}>Cozinha</p>
          <h2 id="cozinha-title" className={styles.chapterTitle}>A cozinha no <em>ritmo do salão.</em></h2>
          <p className={styles.lead}>O pedido feito no celular do cliente aparece na tela da cozinha. A equipe move cada um até ficar pronto.</p>
          <ul className={styles.points}>
            {POINTS.map(([title, text]) => (
              <li key={title}><strong>{title}</strong><span>{text}</span></li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={1} className={styles.kitchenDemo}>
          <KitchenBoardDemo />
        </Reveal>
      </div>
    </section>
  );
}
