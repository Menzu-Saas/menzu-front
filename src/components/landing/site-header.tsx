"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui";
import styles from "./landing.module.css";

/** Sticky header: transparent at the top, frosted once the page scrolls. */
export function SiteHeader({ loginHref, signupHref }: { loginHref: string; signupHref: string }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry!.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className={styles.sentinel} />
      <header className={styles.header} data-scrolled={scrolled}>
        <div className={styles.headerInner}>
          <Link href="/" aria-label="Menzu, início" className={styles.press}>
            <Logo size="sm" />
          </Link>
          <nav aria-label="Seções" className={styles.nav}>
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <div className={styles.account}>
            <Link href={loginHref} className={styles.textLink}>Entrar</Link>
            <Link href={signupHref} className={`${styles.button} ${styles.buttonSmall}`}>Criar conta</Link>
          </div>
        </div>
      </header>
    </>
  );
}
