import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Company details used by the legal pages. Replace the bracketed values before publishing: until then the
 * pages show a draft notice.
 */
export const LEGAL = {
  company: "[RAZÃO SOCIAL DO MENZU]",
  cnpj: "[CNPJ]",
  address: "[ENDEREÇO COMPLETO]",
  email: "[E-MAIL DE CONTATO]",
  dpo: "[NOME DO ENCARREGADO DE DADOS]",
  dpoEmail: "[E-MAIL DO ENCARREGADO]",
  forum: "[CIDADE/UF]",
  updatedAt: "26 de novembro de 2026",
};

export const LEGAL_IS_DRAFT = Object.values(LEGAL).some((value) => value.startsWith("["));

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return <main className="min-h-dvh bg-surface px-4 py-8 sm:px-6">
    <article className="mx-auto max-w-3xl space-y-5 text-body text-ink-secondary [&_h2]:mt-8 [&_h2]:text-subheading [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">
      <nav className="flex gap-4 text-body-sm font-bold text-brand">
        <Link href="/">Menzu</Link><Link href="/termos">Termos de uso</Link><Link href="/privacidade">Privacidade</Link>
      </nav>
      <h1 className="text-title-xl text-ink">{title}</h1>
      <p className="text-caption text-ink-muted">Última atualização: {LEGAL.updatedAt}</p>
      {LEGAL_IS_DRAFT && <p role="note" className="rounded-xl border border-dashed border-line bg-surface-muted p-4 text-body-sm">
        Versão preliminar. Os dados da empresa entre colchetes ainda serão preenchidos, e o texto passará por revisão jurídica.
      </p>}
      {children}
    </article>
  </main>;
}
