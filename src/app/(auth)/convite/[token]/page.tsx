import type { Metadata } from "next";
import { AcceptInviteButton } from "@/components/auth/accept-invite-button";
import { AuthHeader } from "@/components/auth/auth-header";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui";
import Link from "next/link";
import { getSessionUser } from "@/server/auth";

export const metadata: Metadata = { title: "Convite para equipe" };

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getSessionUser();
  const next = encodeURIComponent(`/convite/${token}`);

  if (!user) {
    return (
      <>
        <AuthHeader
          eyebrow="Convite"
          title="Você foi convidado para uma equipe"
          description="Entre ou crie sua conta com o mesmo e-mail que recebeu o convite para participar do restaurante."
        />
        <div className="flex flex-col gap-3">
          <Button asChild size="xl" block>
            <Link href={`/entrar?next=${next}`}>Entrar para aceitar</Link>
          </Button>
          <Button asChild variant="outline" size="xl" block>
            <Link href={`/cadastro?next=${next}`}>Criar conta</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthHeader
        eyebrow="Convite"
        title="Entrar na equipe"
        description={
          <>
            Você vai aceitar o convite como <strong className="font-bold text-ink">{user.email}</strong>. O convite só
            vale para o e-mail convidado.
          </>
        }
      />
      <AcceptInviteButton token={token} />
      <div className="flex items-center justify-between gap-3 text-body-sm text-ink-muted">
        <span>Não é você?</span>
        <SignOutButton variant="ghost" next={`/convite/${token}`}>
          Sair desta conta
        </SignOutButton>
      </div>
    </>
  );
}
