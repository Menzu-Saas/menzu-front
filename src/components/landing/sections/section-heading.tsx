import type { ReactNode } from "react";
import { Reveal } from "../motion/reveal";
import styles from "../landing.module.css";

/** Chapter opener: mono label, large title, optional short text. */
export function SectionHeading({ id, label, title, children, align = "start" }: { id: string; label: string; title: ReactNode; children?: ReactNode; align?: "start" | "center" }) {
  return (
    <Reveal className={styles.sectionHeading} >
      <div data-align={align} className={styles.sectionHeadingInner}>
        <p className={styles.label}>{label}</p>
        <h2 id={id} className={styles.chapterTitle}>{title}</h2>
        {children && <p className={styles.lead}>{children}</p>}
      </div>
    </Reveal>
  );
}
