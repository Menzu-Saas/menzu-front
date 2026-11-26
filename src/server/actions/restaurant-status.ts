"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MANAGEMENT_ROLES } from "@/lib/roles";
import { parseMenzuError } from "@/lib/order-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMemberOf } from "@/server/auth";

export type SetStoreStatusResult = { ok: true } | { ok: false; error: string };

const statusSchema = z.enum(["OPEN", "PAUSED", "CLOSED"]);

/** Opens, pauses or closes the restaurant rendered on the page (OWNER/MANAGER; the RPC re-checks the role). */
export async function setStoreStatusAction(rid: string, status: string): Promise<SetStoreStatusResult> {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Status inválido." };
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_restaurant_status", {
    p_restaurant_id: member.restaurantId,
    p_status: parsed.data,
  });
  if (error) return { ok: false, error: parseMenzuError(error).message };
  revalidatePath("/painel", "layout");
  return { ok: true };
}
