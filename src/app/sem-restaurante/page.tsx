import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button, Icon, Logo } from "@/components/ui";
import { RESTAURANT_ACCESS_PATH } from "@/lib/role-home";
import { getMemberships, requireUser } from "@/server/auth";

export const metadata = { title: "Acesso ao restaurante" };

export default async function RestaurantAccessPage() {
  await requireUser("/sem-restaurante");
  if ((await getMemberships()).some(({ role }) => role !== "DELIVERY")) redirect(RESTAURANT_ACCESS_PATH);
  return <main className="mx-auto flex w-full max-w-140 flex-1 flex-col justify-center gap-6 px-5 py-10">
    <Link href="/" aria-label="Menzu — início" className="self-start"><Logo size="sm" /></Link>
    <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <Icon icon={Store} size={24} className="mb-4 text-brand" />
      <h1 className="text-title-xl">Esta conta ainda não tem acesso a um restaurante</h1>
      <p className="mt-3 text-body-sm text-ink-muted">Se você já faz parte de uma equipe, entre com a conta convidada e aceite o convite enviado pelo responsável da loja.</p>
      <div className="mt-6 grid gap-3">
        <SignOutButton next={RESTAURANT_ACCESS_PATH} size="lg" className="w-full">Entrar com outra conta</SignOutButton>
        <Button asChild size="lg"><Link href="/onboarding">Criar restaurante</Link></Button>
        <Button asChild variant="ghost"><Link href="/">Voltar ao início</Link></Button>
      </div>
    </div>
  </main>;
}
