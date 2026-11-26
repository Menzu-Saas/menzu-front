import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHeader } from "@/components/auth/auth-header";
import { SignupForm } from "@/components/auth/signup-form";
import { TextLink } from "@/components/auth/text-link";
import { isCustomerCheckout } from "@/lib/customer-checkout";
import { safeNextPath } from "@/lib/safe-next";
import { getSessionUser } from "@/server/auth";
export const metadata: Metadata = { title: "Criar conta" };
export default async function Signup({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next) ?? "/onboarding";
  if (await getSessionUser()) redirect(next);
  const loginHref = "/entrar?next=" + encodeURIComponent(next === "/onboarding" ? "/acessar" : next);
  return <><AuthHeader eyebrow="Menzu para restaurantes" title="Crie sua conta" description="Cadastre sua conta para gerenciar seu restaurante." /><SignupForm next={next} loginHref={loginHref} requireCpf={isCustomerCheckout(next)} /><p className="text-body-sm text-ink-muted">Já tem conta? <TextLink href={loginHref}>Entrar</TextLink></p></>;
}

