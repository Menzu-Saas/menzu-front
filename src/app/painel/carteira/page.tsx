import { ActivatePixButton } from "@/components/wallet/activate-pix-button";
import { AsaasAccountForm } from "@/components/wallet/asaas-account-form";
import { pixKeyState, type PixKeyState } from "@/server/payments/asaas-pix-key";
import { Button, PageHeader } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { requireMember } from "@/server/auth";
import { restaurantAsaasClient } from "@/server/payments/asaas-store";
import { asaasEnvironment } from "@/server/payments/asaas-security";

export const metadata = { title: "Carteira" };
export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const { restaurantId } = await requireMember(["OWNER"]);
  let balance: number | null = null;
  let statement: Awaited<ReturnType<NonNullable<Awaited<ReturnType<typeof restaurantAsaasClient>>>["getStatement"]>> | null = null;
  let message = "Crie a conta de pagamentos deste restaurante para consultar sua carteira.";
  let sandbox = true;
  let hasAccount = false;
  let pix: PixKeyState | null = null;
  try {
    sandbox = asaasEnvironment() === "sandbox";
    const client = await restaurantAsaasClient(restaurantId);
    if (client) {
      hasAccount = true;
      pix = await pixKeyState(client); // read only; null when Asaas cannot be reached
      [balance, statement] = await Promise.all([client.getBalanceCents(), client.getStatement()]);
      message = "Saldo consultado no Asaas. Recebíveis ainda não liquidados não estão incluídos no disponível.";
    }
  } catch {
    message = "Não foi possível consultar sua carteira. Verifique a configuração da integração e tente novamente.";
  }
  return <div className="flex flex-col gap-5.5">
    <PageHeader title="Carteira" description="Saldo e movimentações do seu restaurante" />
    {sandbox && <p role="status" className="rounded-xl border border-line bg-surface-muted p-4 text-body-sm">Ambiente de testes Asaas — valores sem movimentação real.</p>}
    {!hasAccount && <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="mb-4 text-subheading">Conta de pagamentos</h2>
      <AsaasAccountForm />
    </section>}
    {pix !== null && pix !== "ACTIVE" && <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="mb-2 text-subheading">Pix ainda não está ativo</h2>
      <p role="status" className="mb-4 text-body-sm text-ink-muted">{pix === "PENDING"
        ? "A chave Pix está em ativação no Asaas. Enquanto isso, os clientes não conseguem pagar por Pix."
        : "Sem uma chave Pix, os clientes não conseguem pagar por Pix. Ative para criar uma chave aleatória."}</p>
      <ActivatePixButton />
    </section>}
    <section className="rounded-2xl border border-line bg-surface p-6">
      <p className="text-body-sm text-ink-muted">Saldo disponível</p>
      <p className="my-3 text-3xl font-extrabold">{balance === null ? "—" : formatMoney(balance)}</p>
      <p role="status" className="mb-5 text-body-sm text-ink-muted">{message}</p>
      <Button disabled aria-describedby="withdrawal-unavailable">Retirar saldo</Button>
      <p id="withdrawal-unavailable" className="mt-3 text-caption text-ink-muted">Retiradas aguardam verificação do beneficiário e homologação da conciliação de transferências.</p>
    </section>
    <section className="overflow-hidden rounded-2xl border border-line bg-surface p-6">
      <h2 className="mb-4 text-subheading">Últimas movimentações</h2>
      {statement?.data.length ? <div className="overflow-x-auto"><table className="w-full text-left text-body-sm"><thead><tr><th className="p-3">Data</th><th className="p-3">Descrição</th><th className="p-3 text-right">Valor</th></tr></thead><tbody>{statement.data.map(item => <tr key={item.id} className="border-t border-line"><td className="p-3">{item.date}</td><td className="p-3">{item.description || item.type}</td><td className="p-3 text-right">{formatMoney(Math.round(item.value * 100))}</td></tr>)}</tbody></table>{statement.hasMore && <p className="mt-3 text-caption text-ink-muted">Exibindo as 20 movimentações mais recentes retornadas pelo Asaas.</p>}</div> : <p className="text-body-sm text-ink-muted">{statement ? "Nenhuma movimentação encontrada." : "O extrato aparecerá após a conexão da subconta."}</p>}
    </section>
  </div>;
}
