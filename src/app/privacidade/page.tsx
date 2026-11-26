import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  return <LegalPage title="Política de privacidade">
    <p>
      Esta política explica como o Menzu, operado por <strong>{LEGAL.company}</strong>, CNPJ {LEGAL.cnpj}, trata dados
      pessoais, de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, “LGPD”). Ela complementa os <Link className="font-bold text-brand" href="/termos">Termos de uso</Link>.
    </p>

    <h2>1. Papéis</h2>
    <ul>
      <li>Para os dados de quem faz pedidos, o <strong>restaurante</strong> é quem decide sobre o atendimento e o Menzu trata os dados para executar o pedido em nome dele.</li>
      <li>Para as contas de restaurantes, a mensalidade e a segurança da plataforma, o <strong>Menzu</strong> é o controlador.</li>
    </ul>

    <h2>2. Dados que tratamos</h2>
    <ul>
      <li><strong>Identificação e contato</strong>: nome, celular e, se informado, e-mail.</li>
      <li><strong>Endereço de entrega</strong> e, se você permitir no navegador, a <strong>localização do aparelho</strong>, usada para preencher o endereço e marcar o ponto exato da entrega. Você pode negar e digitar o endereço.</li>
      <li><strong>CPF</strong>: só para pagar online (Pix ou cartão), porque o Asaas exige para emitir a cobrança. Sem conta, fica guardado apenas no seu aparelho; com conta, fica cifrado no nosso banco de dados. Ele não é pedido no pagamento presencial e não vai junto com os dados do pedido na fila de processamento.</li>
      <li><strong>Pedido</strong>: itens, valores, horários, observações, cupons e avaliações.</li>
      <li><strong>Pagamento</strong>: forma de pagamento e situação da cobrança. <strong>Dados de cartão não passam pelo Menzu</strong>: o cartão é digitado na página do Asaas.</li>
      <li><strong>Restaurantes</strong>: dados da conta, da equipe, do estabelecimento e, para a conta de pagamentos e a mensalidade, CPF/CNPJ, endereço e faturamento, que são enviados ao Asaas e não ficam salvos no Menzu.</li>
      <li><strong>Segurança</strong>: registros técnicos e uma identificação derivada do endereço IP (sem guardar o IP), usada para limitar abusos.</li>
      <li><strong>Cookies e armazenamento local</strong>: apenas os necessários para login, carrinho, rascunho do pedido e acompanhamento do pedido. Não usamos cookies de publicidade.</li>
    </ul>

    <h2>3. Para que usamos e com qual base legal</h2>
    <ul>
      <li>Receber, preparar, entregar e acompanhar pedidos; cobrar pagamentos online e estornar quando necessário: <strong>execução de contrato</strong>.</li>
      <li>Emitir cobranças e cumprir obrigações fiscais e regulatórias: <strong>cumprimento de obrigação legal</strong>.</li>
      <li>Prevenir fraudes, testes de cartão e abusos; manter a plataforma segura: <strong>legítimo interesse</strong> e <strong>prevenção à fraude</strong>.</li>
      <li>Localização precisa para entrega: <strong>consentimento</strong>, que você pode negar ou retirar no aparelho.</li>
    </ul>

    <h2>4. Com quem compartilhamos</h2>
    <ul>
      <li><strong>O restaurante</strong> do seu pedido, que precisa dos dados para atender e entregar.</li>
      <li><strong>Asaas</strong>, instituição de pagamento, para cobranças, estornos e contas de pagamento.</li>
      <li><strong>Supabase</strong> (banco de dados e autenticação) e <strong>Render</strong> (hospedagem), que operam os sistemas em nosso nome.</li>
      <li><strong>Photon/komoot</strong> (mapas baseados no OpenStreetMap), que recebe apenas as coordenadas ou o endereço digitado para encontrar o endereço ou o ponto da entrega, sem nome, telefone ou outros dados.</li>
      <li>Autoridades, quando exigido por lei ou ordem judicial.</li>
    </ul>
    <p>Não vendemos dados pessoais.</p>

    <h2>5. Transferência internacional</h2>
    <p>O banco de dados e a hospedagem ficam em servidores nos Estados Unidos. A transferência segue o art. 33 da LGPD, com fornecedores que adotam garantias contratuais e medidas de segurança compatíveis.</p>

    <h2>6. Por quanto tempo guardamos</h2>
    <p>Pelo tempo necessário para as finalidades acima. Dados de pedidos e pagamentos são mantidos pelos prazos exigidos pela legislação fiscal e de defesa do consumidor; depois disso são excluídos ou anonimizados.</p>

    <h2>7. Segurança</h2>
    <p>Usamos conexão criptografada (HTTPS), controle de acesso por papel na equipe, cifragem do CPF e das chaves de pagamento, e registros de auditoria. Nenhum sistema é totalmente imune a incidentes; se ocorrer um que traga risco relevante, avisaremos os afetados e a ANPD, conforme a lei.</p>

    <h2>8. Seus direitos</h2>
    <p>Você pode pedir confirmação do tratamento, acesso, correção, anonimização ou eliminação de dados desnecessários, portabilidade, informação sobre compartilhamento e revisão de decisões, além de retirar consentimentos (art. 18 da LGPD). Para dados de um pedido, o pedido pode ser encaminhado ao restaurante responsável.</p>

    <h2>9. Encarregado de dados</h2>
    <p>Encarregado (DPO): {LEGAL.dpo} — {LEGAL.dpoEmail}. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>

    <h2>10. Menores de idade</h2>
    <p>O Menzu não é destinado a menores de 18 anos sem a supervisão de um responsável.</p>

    <h2>11. Alterações</h2>
    <p>Podemos atualizar esta política. A data no topo indica a versão em vigor, e mudanças relevantes serão avisadas.</p>
  </LegalPage>;
}
