import Link from "next/link";
import { Logo } from "@/components/ui";
import styles from "./landing.module.css";

export function SiteFooter({ loginHref }: { loginHref: string }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Link href="/" aria-label="Menzu, início" className={styles.press}><Logo size="sm" /></Link>
          <p>Cardápio, pedidos, cozinha e entrega em um só lugar.</p>
        </div>
        <nav aria-label="Rodapé" className={styles.footerNav}>
          <a href="#recursos">Recursos</a>
          <a href="#duvidas">Dúvidas</a>
          <Link href={loginHref}>Entrar</Link>
          <Link href="/termos">Termos de uso</Link>
          <Link href="/privacidade">Privacidade</Link>
        </nav>
        <small className={styles.label}>© {new Date().getFullYear()} Menzu</small>
      </div>
    </footer>
  );
}
