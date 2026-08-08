import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";
import { getOpeningHours, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o SushiFull trata os dados pessoais de quem faz pedidos pelo site.",
};

export default async function PrivacidadePage() {
  const [settings, hours] = await Promise.all([getSettings(), getOpeningHours()]);

  return (
    <LegalPage
      title="Política de Privacidade"
      updatedAt="8 de agosto de 2026"
      settings={settings}
      hours={hours}
    >
      <p>
        Esta política explica quais dados pessoais coletamos quando você faz um pedido pelo nosso
        site, por que coletamos e o que você pode fazer a respeito. Ela segue a Lei Geral de
        Proteção de Dados (Lei nº 13.709/2018).
      </p>

      <Section heading="Quais dados coletamos">
        <p>Só o necessário para preparar e entregar o seu pedido:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-cream">Nome e telefone</strong> — para identificar o pedido e
            falar com você pelo WhatsApp.
          </li>
          <li>
            <strong className="text-cream">Endereço de entrega</strong> — rua, número,
            complemento, bairro, cidade e ponto de referência. Só quando você escolhe entrega.
          </li>
          <li>
            <strong className="text-cream">Itens, forma de pagamento e observações</strong> do
            pedido.
          </li>
        </ul>
        <p>
          Não pedimos CPF, não pedimos dados de cartão e não processamos pagamento pelo site. O
          pagamento acontece na entrega ou na retirada, direto com o restaurante.
        </p>
      </Section>

      <Section heading="Dados guardados no seu aparelho">
        <p>
          Para você não redigitar tudo a cada pedido, seus dados de contato e endereço ficam
          salvos no <strong className="text-cream">seu próprio navegador</strong> (localStorage).
          Eles não são enviados a lugar nenhum por esse mecanismo e somem se você limpar os dados
          do site.
        </p>
        <p>
          Nosso site <strong className="text-cream">não permite consultar dados de clientes</strong>{" "}
          a partir de um telefone. Isso é proposital: uma consulta assim permitiria a qualquer
          visitante descobrir o nome e o endereço de outras pessoas.
        </p>
      </Section>

      <Section heading="Por que tratamos esses dados">
        <p>
          Para executar o pedido que você fez (art. 7º, V da LGPD) e para manter o histórico
          necessário à operação do restaurante e às obrigações fiscais.
        </p>
      </Section>

      <Section heading="Com quem compartilhamos">
        <p>
          Com ninguém para fins de marketing. Seus dados aparecem apenas: no WhatsApp do
          restaurante, quando você envia o pedido; e no painel interno, acessível somente por
          pessoas autorizadas com login e senha.
        </p>
        <p>
          O site é hospedado na Vercel e os dados ficam em banco na Supabase, empresas que atuam
          como operadoras e não usam esses dados para finalidade própria.
        </p>
      </Section>

      <Section heading="Por quanto tempo guardamos">
        <p>
          Pedidos e cadastro de clientes ficam guardados enquanto o restaurante estiver em
          operação, para consulta de histórico. Você pode pedir a exclusão a qualquer momento.
        </p>
      </Section>

      <Section heading="Seus direitos">
        <p>
          Você pode pedir para confirmar, acessar, corrigir, anonimizar ou excluir seus dados, e
          também revogar o consentimento. Basta falar com a gente pelo WhatsApp{" "}
          <strong className="text-cream">{settings.whatsappDisplay}</strong>
          {settings.contactEmail && (
            <>
              {" "}
              ou pelo e-mail{" "}
              <strong className="text-cream">{settings.contactEmail}</strong>
            </>
          )}
          . Respondemos em até 15 dias.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>
          Não usamos cookies de publicidade nem de rastreamento de terceiros. Usamos apenas o
          armazenamento local descrito acima e, na área administrativa, um cookie de sessão
          necessário para manter o login.
        </p>
      </Section>
    </LegalPage>
  );
}
