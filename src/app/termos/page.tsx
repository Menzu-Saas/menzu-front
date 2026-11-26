import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return <LegalPage title="Termos de uso">
    <p>
      Estes termos regem o uso do Menzu, plataforma de cardápio digital, pedidos e gestão para restaurantes,
      operada por <strong>{LEGAL.company}</strong>, CNPJ {LEGAL.cnpj}, com sede em {LEGAL.address} (“Menzu”).
      Ao usar o Menzu, você concorda com estes termos e com a <Link className="font-bold text-brand" href="/privacidade">Política de Privacidade</Link>.
    </p>

    <h2>1. Quem usa o Menzu</h2>
    <ul>
      <li><strong>Restaurantes</strong>: empresas ou pessoas que cadastram um estabelecimento, montam o cardápio e recebem pedidos.</li>
      <li><strong>Clientes</strong>: pessoas que fazem pedidos pelo cardápio de um restaurante, com ou sem conta.</li>
    </ul>
    <p>O Menzu fornece a tecnologia. Cada restaurante é o único responsável pelos produtos, preços, preparo, qualidade, entrega, atendimento e pela emissão de documentos fiscais das suas vendas.</p>

    <h2>2. Conta e acesso</h2>
    <ul>
      <li>Você deve fornecer dados verdadeiros e mantê-los atualizados.</li>
      <li>A senha é pessoal. Você responde pelo que for feito com a sua conta.</li>
      <li>O dono do restaurante define quem da equipe acessa o painel e com quais permissões.</li>
    </ul>

    <h2>3. Pedidos</h2>
    <ul>
      <li>O pedido é um acordo entre o cliente e o restaurante. Valores, taxas de entrega e prazos aparecem antes da confirmação.</li>
      <li>O restaurante pode recusar ou cancelar um pedido, por exemplo por falta de produto ou fora da área de entrega.</li>
      <li>Dúvidas sobre o pedido devem ser tratadas primeiro com o restaurante, pelos contatos exibidos na página do pedido.</li>
    </ul>

    <h2>4. Pagamentos</h2>
    <ul>
      <li>Pagamentos online (Pix e cartão) são processados pelo <strong>Asaas</strong>, instituição de pagamento parceira. O cartão é digitado na página segura do Asaas: o Menzu não recebe nem armazena dados de cartão.</li>
      <li>Para pagar online, o cliente informa o CPF, exigido pelo Asaas para emitir a cobrança. No pagamento presencial o CPF não é pedido.</li>
      <li>O pagamento presencial (dinheiro ou cartão na entrega/retirada) é feito diretamente ao restaurante.</li>
    </ul>

    <h2>5. Cancelamento e estorno</h2>
    <ul>
      <li>Se um pedido pago online for cancelado, o valor é <strong>estornado automaticamente</strong> pelo mesmo meio de pagamento.</li>
      <li>O prazo para o dinheiro aparecer depende do meio: no Pix costuma ser rápido; no cartão segue o calendário da operadora e pode aparecer na fatura seguinte.</li>
      <li>Em caso de problema com o produto entregue, fale com o restaurante. Se não houver solução, escreva para {LEGAL.email}.</li>
      <li>Os direitos do Código de Defesa do Consumidor continuam valendo, inclusive nas compras feitas pela internet.</li>
    </ul>

    <h2>6. Condições para restaurantes</h2>
    <ul>
      <li><strong>Mensalidade</strong>: alguns recursos dependem de um plano pago, cobrado todo mês pelo Asaas. Os planos, preços e recursos estão na área <strong>Plano</strong> do painel. Um plano novo vale após a confirmação do primeiro pagamento.</li>
      <li>Sem pagamento da mensalidade, há um período de carência; depois dele, os recursos do plano podem ser suspensos até a regularização.</li>
      <li><strong>Taxa de pagamento online</strong>: em cada venda paga online, o Menzu retém 3,5% sobre o valor líquido (após as tarifas do Asaas). O restante fica na conta de pagamentos do restaurante.</li>
      <li>Para receber pagamentos online, o restaurante abre uma conta de pagamentos no Asaas pelo painel e aceita as condições do Asaas. As tarifas do Asaas são cobradas por ele.</li>
      <li>Em estornos e contestações, o valor devolvido sai da conta do restaurante, incluindo a parte já repassada a ele.</li>
    </ul>

    <h2>7. Uso proibido</h2>
    <ul>
      <li>Vender produtos ilegais ou que exijam autorização que o restaurante não tenha.</li>
      <li>Fraudar pedidos, pagamentos, cupons ou avaliações; testar cartões de terceiros.</li>
      <li>Tentar acessar dados ou áreas sem permissão, sobrecarregar ou copiar a plataforma.</li>
    </ul>
    <p>O Menzu pode suspender contas que violem estes termos, avisando sempre que possível.</p>

    <h2>8. Disponibilidade e responsabilidade</h2>
    <p>Trabalhamos para manter o Menzu disponível e seguro, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros (hospedagem, internet, meios de pagamento). O Menzu não responde pelos produtos e serviços dos restaurantes, nem por danos causados por uso indevido da conta.</p>

    <h2>9. Alterações</h2>
    <p>Podemos atualizar estes termos. Mudanças relevantes serão avisadas no painel ou por e-mail antes de valerem.</p>

    <h2>10. Contato e foro</h2>
    <p>Contato: {LEGAL.email}. Fica eleito o foro de {LEGAL.forum}, ressalvado o direito do consumidor de ajuizar ações no seu domicílio.</p>
  </LegalPage>;
}
