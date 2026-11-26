import { safeNextPath } from "@/lib/safe-next";
import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { FormAlert } from "@/components/auth/form-alert";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { TextLink } from "@/components/auth/text-link";
import { getSessionUser, hasRecoverySession } from "@/server/auth";

export const metadata: Metadata = { title: "Redefinir senha" };

/** Reached from the recovery e-mail via /auth/callback, which leaves a recovery session. */
export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNextPath((await searchParams).next) ?? undefined;
  const user = await getSessionUser();

  // Only a fresh recovery-link session may set a password without the current one.
  if (!user || !(await hasRecoverySession())) {
    return (
      <>
        <AuthHeader title="Link expirado" />
        <FormAlert>O link de recuperação expirou ou já foi usado. Solicite um novo e-mail para continuar.</FormAlert>
        <TextLink href={next ? `/recuperar-senha?next=${encodeURIComponent(next)}` : "/recuperar-senha"} className="text-body-sm">
          Solicitar novo link
        </TextLink>
      </>
    );
  }

  return (
    <>
      <AuthHeader
        title="Crie uma nova senha"
        description={
          <>
            Conta <strong className="font-bold text-ink">{user.email}</strong>
          </>
        }
      />
      <ResetPasswordForm next={next} />
    </>
  );
}
