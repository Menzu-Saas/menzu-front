"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge, Button, Input } from "@/components/ui";
import type { CourierCommand, CourierDashboard } from "@/lib/courier";
import type { DeliveryOrder } from "@/lib/delivery";
import { parseMoneyToCents, formatMoney } from "@/lib/money";
import { zonedTime } from "@/lib/opening-hours";
import { courierCommandAction, getCourierDashboardAction } from "@/server/actions/courier";
import { listDeliveryOrdersAction } from "@/server/actions/delivery";

export function CourierManagement({ initial, initialOrders = [] }: { initial: CourierDashboard; initialOrders?: DeliveryOrder[] }) {
  const [data, setData] = useState(initial);
  const [orders, setOrders] = useState(initialOrders);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [base, setBase] = useState(initial.base_cents === null ? "" : (initial.base_cents / 100).toFixed(2).replace(".", ","));
  const [orderId, setOrderId] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const running = useRef(false);
  const rid = data.restaurant_id;

  useEffect(() => {
    let stopped = false;
    let pending = false;
    const refresh = async () => {
      if (pending || running.current || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const [dashboard, delivery] = await Promise.all([getCourierDashboardAction(rid), listDeliveryOrdersAction(rid)]);
        if (stopped) return;
        if (dashboard.ok) setData(dashboard.data);
        if (delivery.ok) setOrders(delivery.data);
        if (!dashboard.ok || !delivery.ok) setError("Não foi possível atualizar a operação. Os dados exibidos podem estar desatualizados.");
      } catch { if (!stopped) setError("Sem conexão com a operação. Tente novamente."); }
      finally { pending = false; }
    };
    const id = setInterval(() => void refresh(), 30_000);
    window.addEventListener("focus", refresh);
    return () => { stopped = true; clearInterval(id); window.removeEventListener("focus", refresh); };
  }, [rid]);

  async function run(command: CourierCommand, success: string) {
    if (running.current) return;
    running.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const result = await courierCommandAction(rid, command);
      if (result.ok) { setData(result.data); setMessage(success); }
      else setError(result.error);
    } catch { setError("Não foi possível salvar. Confira a conexão e tente novamente."); }
    finally { running.current = false; setBusy(false); }
  }
  const promotionPayload = promotionId ? { promotion_id: promotionId } : {};
  const ready = orders.filter((o) => o.status === "READY");
  const pendingApproval = data.assignments.filter((a) => a.status === "DELIVERED" && a.completed_at && !a.approved_at);
  const field = "min-h-11 w-full border border-line bg-surface-muted px-3 text-body text-ink";

  function createPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const toISO = (value: string) => {
      const [date, time] = value.split("T");
      const [year, month, day] = date.split("-").map(Number);
      const [hour, minute] = time.split(":").map(Number);
      return zonedTime(year, month, day, hour * 3600 + minute * 60, data.timezone).toISOString();
    };
    try {
      const bonus = parseMoneyToCents(String(form.get("bonus")));
      if (bonus <= 0) { setError("Informe um bônus maior que zero."); return; }
      void run({ action: "promotion", payload: { title: String(form.get("title")), terms: String(form.get("terms")), bonus_cents: bonus, starts_at: toISO(String(form.get("start"))), ends_at: toISO(String(form.get("end"))) } }, "Promoção cadastrada.");
    } catch { setError("Confira as datas e os valores da promoção."); }
  }

  return <section aria-label="Gestão de entregas" className="bg-surface py-2">
    <div className="mx-auto flex max-w-container flex-col gap-5">
      {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
      {message && <p role="status" className="text-body-sm text-success">{message}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3"><h2 className="text-subheading text-ink">Entregadores da loja</h2>
          {!data.members.length ? <p className="text-body-sm text-ink-muted">Nenhum entregador cadastrado. <Link className="font-bold text-brand underline" href="/painel/equipe">Cadastrar na equipe</Link></p> : <ul className="divide-y divide-line">{data.members.map((m) => <li key={m.user_id} className="space-y-3 py-3">
            <div className="flex items-center justify-between gap-3"><span className="text-body-sm text-ink">{m.full_name || "Entregador"}</span><Badge tone={m.active && !m.stale ? "success" : "neutral"}>{m.active && !m.stale ? "Ativo" : m.active ? "Sem conexão recente" : "Inativo"}</Badge></div>
            {data.is_manager ? <form key={String(m.dispatch_enabled)} aria-label={`Ofertas para ${m.full_name || "Entregador"}`} className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
              event.preventDefault(); const form = new FormData(event.currentTarget);
              void run({ action: "eligibility", payload: { user_id: m.user_id, enabled: form.get("enabled") === "on" } }, "Recebimento de ofertas atualizado.");
            }}>
              <label className="flex min-h-11 items-center gap-2 text-body-sm"><input aria-label={`Permitir ofertas para ${m.full_name || "Entregador"}`} name="enabled" type="checkbox" defaultChecked={m.dispatch_enabled !== false} className="size-4 accent-brand" />Receber ofertas</label>
              <Button type="submit" size="sm" disabled={busy}>Salvar recebimento</Button>
            </form> : <p className="text-caption text-ink-muted">{m.dispatch_enabled === false ? "Ofertas desabilitadas" : "Pode receber ofertas"}</p>}
          </li>)}</ul>}
          <p className="text-caption text-ink-muted">Pedidos prontos geram ofertas automaticamente. Quem ainda não concluiu uma entrega vem primeiro; depois, quem está há mais tempo desde a última entrega concluída. Empates seguem o tempo de disponibilidade. Só entregadores ativos, habilitados e sem outra entrega participam. Se houver apenas um, só ele recebe.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-caption text-ink-muted">Pedido pronto<select aria-label="Pedido pronto" className={field} value={orderId} onChange={(e) => setOrderId(e.target.value)}><option value="">Selecione</option>{ready.map((o) => <option key={o.id} value={o.id}>#{o.number}{data.assignments.some((a) => a.order_id === o.id) ? " · já disponibilizado" : ""}</option>)}</select></label>
          </div>
          <label className="block space-y-1 text-caption text-ink-muted">Bônus da promoção<select aria-label="Bônus da promoção" className={field} value={promotionId} onChange={(e) => setPromotionId(e.target.value)}><option value="">Sem bônus</option>{data.promotions.map((p) => <option key={p.id} value={p.id}>{p.title} · +{formatMoney(p.bonus_cents)}</option>)}</select></label>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !orderId} onClick={() => void run({ action: "offer", payload: { order_id: orderId, ...promotionPayload } }, "Pedido redistribuído por prioridade.")}>Redistribuir por prioridade</Button></div>
          {data.base_cents === null && <p className="text-caption text-ink-muted">As ofertas continuam funcionando. Defina a remuneração para informar o ganho ao entregador e permitir sua aprovação.</p>}
        </div>
        {data.is_manager && <div className="space-y-3"><h2 className="text-subheading text-ink">Remuneração e aprovação</h2><p className="text-body-sm text-ink-muted">A remuneração é separada da taxa cobrada do cliente. A taxa da loja entra no total do checkout; o ganho do entregador segue esta configuração.</p>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (!base.trim() || !Number.isSafeInteger(parseMoneyToCents(base)) || parseMoneyToCents(base) < 0) { setError("Informe um valor válido."); return; } void run({ action: "configure", payload: { base_cents: parseMoneyToCents(base) } }, "Remuneração salva para as próximas entregas e para aquelas que ainda estavam com valor a definir."); }}><label className="min-w-0 flex-1 space-y-1 text-caption text-ink-muted">Ganho base por entrega<Input aria-label="Ganho base por entrega" inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} placeholder="0,00" required /></label><Button type="submit" disabled={busy}>Salvar remuneração</Button></form>
          <h3 className="text-item text-ink">Ganhos aguardando aprovação</h3>
          {!pendingApproval.length ? <p className="text-body-sm text-ink-muted">Nenhuma entrega aguardando aprovação.</p> : <ul className="divide-y divide-line">{pendingApproval.map((a) => <li key={a.order_id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="text-body-sm text-ink">Pedido #{a.number} · {data.members.find((m) => m.user_id === a.user_id)?.full_name || "Entregador"}<span className="block font-bold">{a.remuneration_confirmed === false ? "Defina a remuneração antes de aprovar" : formatMoney(a.base_cents + a.bonus_cents)}</span></div><Button size="sm" disabled={busy || a.remuneration_confirmed === false} onClick={() => void run({ action: "approve", payload: { order_id: a.order_id } }, "Ganho aprovado.")}>Aprovar ganho do pedido #{a.number}</Button></li>)}</ul>}
          <p className="text-caption text-ink-muted">Saques indisponíveis até a habilitação do Pagar.me. O dinheiro cobrado do cliente continua registrado no pedido, sem compensação automática nos ganhos.</p>
        </div>}
      </div>
      {data.is_manager && <details className="border-t border-line pt-4"><summary className="cursor-pointer text-item text-ink">Criar promoção de entregas</summary><form onSubmit={createPromotion} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="space-y-1 text-caption text-ink-muted">Título<Input name="title" required maxLength={100} /></label><label className="space-y-1 text-caption text-ink-muted">Bônus por entrega<Input name="bonus" required inputMode="decimal" placeholder="0,00" /></label><label className="space-y-1 text-caption text-ink-muted">Condições<Input name="terms" required maxLength={500} /></label><label className="space-y-1 text-caption text-ink-muted">Início ({data.timezone})<Input name="start" required type="datetime-local" /></label><label className="space-y-1 text-caption text-ink-muted">Fim ({data.timezone})<Input name="end" required type="datetime-local" /></label><Button type="submit" disabled={busy} className="self-end">Cadastrar promoção</Button></form></details>}
    </div>
  </section>;
}
