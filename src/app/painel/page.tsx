import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { canSeeDashboard } from "@/components/admin/nav-items";
import { DashboardContent, DashboardSkeleton } from "@/components/dashboard/dashboard-content";
import { PeriodControl } from "@/components/dashboard/period-control";
import { isPreviewRestaurant } from "@/lib/restaurant-preview";
import { Button, PageHeader } from "@/components/ui";
import { firstName, formatDayLine, greetingFor, parsePeriod, zonedParts } from "@/lib/dashboard";
import { ADMIN_ROLES } from "@/lib/role-home";
import { requireMember } from "@/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileName, getRestaurantClock } from "@/server/queries/dashboard";

export const metadata: Metadata = { title: "Visão geral" };

/** Dashboard (reference P1). OWNER/MANAGER only; ATTENDANT lands on the orders screen instead. */
export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user, restaurantId, role, restaurant } = await requireMember(ADMIN_ROLES);
  if (!canSeeDashboard(role)) redirect("/painel/pedidos");

  const period = parsePeriod((await searchParams).periodo);
  const [clock, profileName] = await Promise.all([getRestaurantClock(restaurantId), getProfileName(user.id)]);
  const now = new Date();
  const name = firstName(profileName ?? (user.user_metadata?.full_name as string | undefined), user.email);
  const greeting = greetingFor(zonedParts(now, clock.timezone).hour);

  return (
    <div className="flex flex-col gap-5.5">
      <PageHeader
        title={name ? `${greeting}, ${name}` : greeting}
        description={`${formatDayLine(now, clock.timezone)} · atualizado agora`}
        actions={
          <>
            <PeriodControl value={period} />
            <Button asChild size="md" className="font-extrabold">
              <Link href="/painel/cardapio/produtos/novo">
                <Plus size={16} strokeWidth={2.1} aria-hidden="true" />
                Novo item
              </Link>
            </Button>
          </>
        }
      />
      <Suspense key={period} fallback={<DashboardSkeleton />}>
        <DashboardContent restaurantId={restaurantId} period={period} timeZone={clock.timezone} preview={isPreviewRestaurant(restaurant)} />
        <RestaurantFeedback restaurantId={restaurantId} />
      </Suspense>
    </div>
  );
}

async function RestaurantFeedback({ restaurantId }: { restaurantId: string }) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("restaurant_feedback", { p_restaurant_id: restaurantId });
  if (error) return null;
  return <section className="rounded-xl border border-line p-4">
    <h2 className="text-title-md">Avaliações recentes do restaurante</h2>
    {!data?.length ? <p>Ainda não há avaliações.</p> : <ul className="divide-y divide-line">
      {data.map((item, index) => <li key={index} className="py-2">
        <strong>{item.stars} de 5 estrelas</strong>
        {item.comment && <p className="break-words whitespace-pre-wrap">{item.comment}</p>}
      </li>)}
    </ul>}
  </section>;
}
