"use client";
import {useState,type FormEvent} from "react";
import {Chip} from "@/components/ui";
import {useRestaurantId} from "@/components/admin/current-restaurant";
import {updatePaymentsAction} from "@/server/actions/settings";
import {SaveButton,SettingsSection,useSave} from "./shared";
import type {PaymentMethodValue} from "@/lib/schemas/settings";
export function PaymentsForm({methods}:{methods:PaymentMethodValue[];provider:"mercadopago"|"development"}) {
 const rid=useRestaurantId();const [cash,setCash]=useState(methods.includes("CASH"));const {pending,save}=useSave();
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();save(()=>updatePaymentsAction(rid,{payment_methods:cash?["CASH"]:[]}),"Pagamento presencial salvo.");}
 return <SettingsSection id="pagamentos" title="Pagamentos"><form onSubmit={submit} className="flex flex-col gap-4"><p role="status" className="text-body-sm text-ink-muted">O pedido é enviado pelo cardápio, sem cadastro. Nesta BETA, o pagamento é em dinheiro na entrega, retirada ou mesa. Pix e cartão online estão indisponíveis.</p><div className="flex flex-wrap gap-2"><Chip active={cash} onClick={()=>setCash(!cash)}>Dinheiro</Chip><Chip disabled>Pix online indisponível</Chip><Chip disabled>Cartão online indisponível</Chip></div><SaveButton pending={pending} dirty={cash !== methods.includes("CASH") || methods.some((m)=>m!=="CASH")}/></form></SettingsSection>;
}
