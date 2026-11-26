import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Logo } from "@/components/ui";
import { homeForRole } from "@/lib/role-home";
import { getMemberships, requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Criar restaurante" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const memberships = await getMemberships();
  const restaurant = memberships.find(({ role }) => role !== "DELIVERY");
  const firstName = (user.user_metadata?.full_name as string | undefined)?.trim().split(/\s+/)[0];

  return (
    <div className="flex flex-1 bg-surface">
      <div className="w-full">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6.5">
          <Link
            href="/"
            aria-label="Menzu — início"
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2.5">
            {restaurant && (
              <Link
                href={homeForRole(restaurant.role)}
                className="rounded-xs text-body-sm font-bold text-brand transition-colors duration-150 ease-out hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Voltar ao restaurante
              </Link>
            )}
            <SignOutButton variant="ghost" />
          </div>
        </div>
        <main className="mx-auto flex w-full max-w-170 flex-col gap-2 p-5 sm:p-6.5">
          <p className="eyebrow text-ink-subtle">{firstName ? `Olá, ${firstName} · ` : ""}Vamos montar seu restaurante</p>
          <OnboardingWizard />
        </main>
      </div>
    </div>
  );
}
