import Link from "next/link";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import { Button, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f1ece6] px-4 py-8">
      <div className="w-full max-w-lg rounded-[2rem] border border-line bg-surface px-6 py-8 text-center sm:p-12">
        <Link href="/" aria-label="Menzu, página inicial" className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-accent">
          <Logo size="md" />
        </Link>
        <div aria-hidden="true" className="my-7 flex items-center justify-center gap-2 rounded-3xl bg-brand-soft py-6 text-5xl font-extrabold text-brand sm:text-6xl">
          <span>4</span>
          <span className="grid size-14 place-items-center rounded-full border-2 border-current sm:size-16">
            <UtensilsCrossed size={27} />
          </span>
          <span>4</span>
        </div>
        <h1 className="text-title-xl">Página não encontrada</h1>
        <p className="mx-auto mt-2 max-w-xs text-body-sm text-ink-muted">
          Confira o endereço ou volte ao início para continuar.
        </p>
        <Button asChild className="mt-6">
          <Link href="/"><ArrowLeft size={18} aria-hidden="true" /> Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}
