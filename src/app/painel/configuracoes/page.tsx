import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MANAGEMENT_ROLES } from "@/lib/roles";
import { AddressForm } from "@/components/settings/address-form";
import { DangerZone } from "@/components/settings/danger-zone";
import { HoursForm } from "@/components/settings/hours-form";
import { OperationForm } from "@/components/settings/operation-form";
import { PaymentsForm } from "@/components/settings/payments-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { PageHeader } from "@/components/ui";
import type { PaymentMethodValue } from "@/lib/schemas/settings";
import { customerAppUrl } from "@/server/app-url";
import { requireMember } from "@/server/auth";
import { isMercadoPagoConfigured } from "@/server/payments";
import { getOpeningHours, getRestaurantSettings } from "@/server/queries/settings";

export const metadata: Metadata = { title: "Configurações" };

/** Configurações da loja (reference P5): perfil, endereço, operação, pagamentos, horários, zona de perigo. */
export default async function ConfiguracoesPage() {
  const { restaurantId, role } = await requireMember(MANAGEMENT_ROLES);
  const [restaurant, hours, url] = await Promise.all([
    getRestaurantSettings(restaurantId),
    getOpeningHours(restaurantId),
    customerAppUrl(),
  ]);
  if (!restaurant) notFound();

  const addressLine = [
    [restaurant.address_street, restaurant.address_number].filter(Boolean).join(", "),
    [restaurant.address_neighborhood, [restaurant.address_city, restaurant.address_state].filter(Boolean).join("/")]
      .filter(Boolean)
      .join(" · "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-5.5">
      <PageHeader title="Configurações" description="Perfil, operação, pagamentos e horários da sua loja." />
      <div className="grid items-start gap-4.5 xl:grid-cols-2">
        <ProfileForm restaurant={restaurant} menuHost={url.replace(/^https?:\/\//, "")} addressLine={addressLine} />
        <OperationForm restaurant={restaurant} />
        <div className="flex min-w-0 flex-col gap-4.5">
          <PaymentsForm
            methods={restaurant.payment_methods as PaymentMethodValue[]}
            provider={isMercadoPagoConfigured() ? "mercadopago" : "development"}
          />
          <AddressForm restaurant={restaurant} />
        </div>
        <HoursForm hours={hours} />
        {role === "OWNER" && <DangerZone slug={restaurant.slug} name={restaurant.name} />}
      </div>
    </div>
  );
}
