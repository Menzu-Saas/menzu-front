"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MANAGEMENT_ROLES } from "@/lib/roles";
import { fieldErrors, type FieldErrors } from "@/lib/schemas/auth";
import { tableSchema, type TableInput } from "@/lib/schemas/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireMemberOf } from "@/server/auth";

export type TableActionResult = { ok: true } | { ok: false; error?: string; fieldErrors?: FieldErrors };

const uuid = z.string().uuid();
const DUPLICATE = { ok: false as const, fieldErrors: { number: "Já existe uma mesa com este número." } };

function done(): TableActionResult {
  revalidatePath("/painel/qrcodes");
  return { ok: true };
}

/** Adds a table (QR code) to the current restaurant. */
export async function addTableAction(rid: string, input: TableInput): Promise<TableActionResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { restaurantId } = member;
  const parsed = tableSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("restaurant_tables")
    .insert({ restaurant_id: restaurantId, number: parsed.data.number, label: parsed.data.label });
  if (error) return error.code === "23505" ? DUPLICATE : { ok: false, error: "Não foi possível adicionar a mesa." };
  return done();
}

/** Renames / renumbers a table of the current restaurant. */
export async function updateTableAction(rid: string, id: string, input: TableInput): Promise<TableActionResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { restaurantId } = member;
  if (!uuid.safeParse(id).success) return { ok: false, error: "Mesa não encontrada." };
  const parsed = tableSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .update({ number: parsed.data.number, label: parsed.data.label })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return error.code === "23505" ? DUPLICATE : { ok: false, error: "Não foi possível salvar a mesa." };
  if (!data?.length) return { ok: false, error: "Mesa não encontrada." };
  return done();
}

/** Removes a table; its printed QR code stops opening the table order mode. */
export async function removeTableAction(rid: string, id: string): Promise<TableActionResult> {
  const member = await requireMemberOf(rid, MANAGEMENT_ROLES);
  if (!member.ok) return member;
  const { restaurantId } = member;
  if (!uuid.safeParse(id).success) return { ok: false, error: "Mesa não encontrada." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível remover a mesa." };
  return done();
}
