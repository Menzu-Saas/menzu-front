import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { Logo } from "@/components/ui";

/** Auth shell: full-width form, split with the brand panel on ≥ lg. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 bg-surface">
      <div className="grid w-full lg:grid-cols-2">
        <Suspense fallback={null}><AuthBrandPanel /></Suspense>
        <main className="flex min-w-0 flex-col gap-6 px-5 py-6 sm:p-6.5 lg:mx-auto lg:my-auto lg:w-full lg:max-w-110 lg:px-8 lg:py-10">
          <Link
            href="/"
            aria-label="Menzu — início"
            className="self-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Logo size="md" />
          </Link>
          {children}
        </main>
      </div>
    </div>
  );
}
