"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { checkoutAddressSchema, type CheckoutAddress, type SavedCheckoutAddress } from "@/components/checkout/checkout-preferences";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { deliveryAddressKey } from "@/lib/delivery-address";
import { geocodeDeliveryAddress } from "@/server/geocoding";
import { isUuid } from "@/lib/uuid";
import type { ActionResult } from "./orders";

export async function listBuyerAddressesAction(): Promise<ActionResult<SavedCheckoutAddress[]>> {
  const user = await requireUser();
  const client = await createSupabaseServerClient() as SupabaseClient;
  // Recover the buyer's recent order addresses without overwriting manually adjusted saved points.
  const history = await client.from("orders").select("address,created_at").eq("buyer_user_id",user.id).eq("type","DELIVERY").order("created_at",{ascending:false}).limit(20);
  const recovered = new Map<string,{user_id:string;address:CheckoutAddress;address_key:string;updated_at:string}>();
  for (const order of history.data ?? []) {
    const parsed = checkoutAddressSchema.safeParse(order.address);
    if (!parsed.success) continue;
    const key = deliveryAddressKey(parsed.data);
    if (!recovered.has(key)) recovered.set(key,{user_id:user.id,address:parsed.data,address_key:key,updated_at:order.created_at});
  }
  if (recovered.size) await client.from("buyer_delivery_addresses").upsert([...recovered.values()],{onConflict:"user_id,address_key",ignoreDuplicates:true});
  const { data, error } = await client.from("buyer_delivery_addresses").select("id,address").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(10);
  if (error) return { ok: false, error: "Não foi possível carregar seus endereços salvos." };
  return { ok: true, data: (data ?? []).flatMap((row) => {
    const parsed = checkoutAddressSchema.safeParse(row.address);
    return parsed.success ? [{ ...parsed.data, id: row.id }] : [];
  }) };
}

export async function saveBuyerAddressAction(address: CheckoutAddress, id?: string): Promise<ActionResult<SavedCheckoutAddress>> {
  const user = await requireUser();
  const parsed = checkoutAddressSchema.safeParse(address);
  if (!parsed.success || (id !== undefined && !isUuid(id))) return { ok: false, error: "Confira o endereço e o ponto de entrega." };
  const client = await createSupabaseServerClient() as SupabaseClient;
  const addressKey = deliveryAddressKey(parsed.data);
  const values = { user_id: user.id, address: parsed.data, address_key: addressKey, updated_at: new Date().toISOString() };
  const query = id ? client.from("buyer_delivery_addresses").update(values).eq("id", id).eq("user_id", user.id)
    : client.from("buyer_delivery_addresses").upsert(values, { onConflict: "user_id,address_key" });
  const { data, error } = await query.select("id,address").single();
  if (error || !data) return { ok: false, error: "Não foi possível salvar na sua conta. Tente novamente." };
  return { ok: true, data: { ...parsed.data, id: data.id } };
}

export async function deleteBuyerAddressAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(id)) return { ok: false, error: "Endereço inválido." };
  const client = await createSupabaseServerClient() as SupabaseClient;
  const { error } = await client.from("buyer_delivery_addresses").delete().eq("id",id).eq("user_id",user.id);
  return error ? { ok: false, error: "Não foi possível remover o endereço." } : { ok: true, data: undefined };
}

export async function locateBuyerAddressAction(address: CheckoutAddress): Promise<ActionResult<{ latitude:number; longitude:number; approximate:boolean; saved:boolean }>> {
  const user = await requireUser();
  const parsed = checkoutAddressSchema.safeParse(address);
  if (!parsed.success) return {ok:false,error:"Preencha CEP, rua, número, bairro e cidade para localizar o endereço."};
  const client = await createSupabaseServerClient() as SupabaseClient;
  const { data } = await client.from("buyer_delivery_addresses").select("address").eq("user_id",user.id).eq("address_key",deliveryAddressKey(parsed.data)).maybeSingle();
  const saved = checkoutAddressSchema.safeParse(data?.address);
  if (saved.success && saved.data.latitude!=null && saved.data.longitude!=null) return {ok:true,data:{latitude:saved.data.latitude,longitude:saved.data.longitude,approximate:false,saved:true}};
  const located = await geocodeDeliveryAddress(parsed.data);
  return located.ok ? {ok:true,data:{...located.data,saved:false}} : located;
}
