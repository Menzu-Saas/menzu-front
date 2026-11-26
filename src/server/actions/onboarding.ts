"use server";

import { redirect } from "next/navigation";
import { parseMenzuError } from "@/lib/order-errors";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import { onboardingSchema, type OnboardingInput } from "@/lib/schemas/restaurant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, writeCurrentRestaurantCookie } from "@/server/auth";

export type CreateRestaurantResult = { ok: false; error?: string; fieldErrors?: FieldErrors };

/** Onboarding wizard submit: validates again, calls `create_restaurant` (caller becomes OWNER) and opens the panel. */
export async function createRestaurantAction(input: OnboardingInput): Promise<CreateRestaurantResult> {
  await requireUser();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const { hours, ...restaurant } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data: rid, error } = await supabase.rpc("create_restaurant", {
    p: {
      ...restaurant,
      hours,
      timezone: "America/Sao_Paulo",
      complete: true,
    },
  });

  if (error || !rid) {
    const { code, message } = parseMenzuError(error);
    if (code === "SLUG_TAKEN") return { ok: false, fieldErrors: { slug: message } };
    return { ok: false, error: message };
  }

  await writeCurrentRestaurantCookie(rid);
  redirect("/painel");
}
