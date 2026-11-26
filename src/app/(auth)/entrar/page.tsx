import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHeader } from "@/components/auth/auth-header";
import { LoginForm } from "@/components/auth/login-form";
import { TextLink } from "@/components/auth/text-link";
import { safeNextPath } from "@/lib/safe-next";
import { getSessionUser } from "@/server/auth";
export const metadata: Metadata = { title: "Entrar" };
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next) ?? "/acessar";
  if (await getSessionUser()) redirect(next);
  return <><AuthHeader eyebrow="Painel do restaurante" title="Que bom ter você de volta" description="Entre para acompanhar pedidos, cardápio e equipe." /><LoginForm next={next} initialError={params.erro === "link" ? "O link expirou ou já foi usado. Entre com sua senha." : undefined} /><p className="text-body-sm text-ink-muted">Ainda não tem conta? <TextLink href="/cadastro?next=%2Fonboarding">Criar conta</TextLink></p></>;
}
