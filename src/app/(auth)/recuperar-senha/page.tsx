import { RESTAURANT_ACCESS_PATH } from "@/lib/role-home";
import { safeNextPath } from "@/lib/safe-next";
import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { TextLink } from "@/components/auth/text-link";

export const metadata: Metadata = { title: "Recuperar senha" };

export default async function RecuperarSenhaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next) ?? RESTAURANT_ACCESS_PATH;
  return (
    <>
      <AuthHeader
        title="Recuperar senha"
        description="Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha."
      />
      <ForgotPasswordForm next={next}
        initialError={params.erro === "link" ? "O link expirou ou já foi usado. Solicite um novo abaixo." : undefined}
      />
      <p className="text-body-sm text-ink-muted">
        Lembrou a senha? <TextLink href={next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar"}>Voltar para entrar</TextLink>
      </p>
    </>
  );
}
