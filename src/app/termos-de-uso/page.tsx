import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";
import { formatBRL } from "@/lib/money";
import { getOpeningHours, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Regras de uso do site de pedidos do SushiFull.",
};

export default async function TermosPage() {
  const [settings, hours] = await Promise.all([getSettings(), getOpeningHours()]);

  return (
    <LegalPage
      title="Termos de Uso"
      updatedAt="8 de agosto de 2026"
      settings={settings}
      hours={hours}
    >
      <p>
        Ao usar este site para montar e enviar um pedido, você concorda com as regras abaixo. Elas
        existem para deixar claro o que esperar de nós e o que esperamos de você.
      </p>

      <Section heading="O que este site faz">
        <p>
          O site mostra nosso cardápio e ajuda você a montar o pedido. Ao finalizar, ele abre o
          WhatsApp com o pedido já escrito, e o atendimento continua por lá.
        </p>
        <p>
          <strong className="text-cream">
            O pedido só é considerado recebido depois que confirmamos pelo WhatsApp.
          </strong>{" "}
          Enviar a mensagem, por si só, não garante o preparo — pode faltar um ingrediente ou a
          cozinha estar no limite.
        </p>
      </Section>

      <Section heading="Preços e disponibilidade">
        <p>
          Os preços exibidos são os vigentes no momento da consulta e podem mudar sem aviso. Itens
          podem sair do cardápio a qualquer momento.
        </p>
        <p>
          Se houver divergência entre o valor mostrado no site e o confirmado no atendimento,
          vale o valor confirmado no WhatsApp — e você pode desistir do pedido sem custo.
        </p>
      </Section>

      <Section heading="Entrega e retirada">
        <p>
          Entregamos apenas nos bairros cadastrados no site. A taxa de entrega aparece antes de
          você finalizar, calculada pelo bairro escolhido.
        </p>
        {settings.freeDeliveryThresholdCents != null && (
          <p>
            Pedidos com subtotal a partir de{" "}
            <strong className="text-cream">
              {formatBRL(settings.freeDeliveryThresholdCents)}
            </strong>{" "}
            têm frete grátis, salvo regra diferente para o bairro.
          </p>
        )}
        {settings.minOrderCents != null && (
          <p>
            O pedido mínimo é de{" "}
            <strong className="text-cream">{formatBRL(settings.minOrderCents)}</strong>,
            considerando apenas os itens, sem a taxa de entrega.
          </p>
        )}
        <p>
          As previsões de tempo são estimativas, não garantias. Chuva, trânsito e volume de
          pedidos afetam o prazo.
        </p>
      </Section>

      <Section heading="Pagamento">
        <p>
          Não recebemos pagamento pelo site. Você paga na entrega ou na retirada, na forma que
          escolheu no pedido. Se escolher dinheiro, informe o valor para o troco.
        </p>
      </Section>

      <Section heading="Cancelamento">
        <p>
          Você pode cancelar sem custo enquanto o preparo não tiver começado — fale com a gente
          pelo WhatsApp o quanto antes. Depois que o pedido entra em produção, alimentos preparados
          não podem ser cancelados.
        </p>
        <p>
          Se algo vier errado ou fora do padrão, avise no mesmo dia: resolvemos com troca ou
          devolução do valor.
        </p>
      </Section>

      <Section heading="Alergias e restrições">
        <p>
          Nossos pratos contêm ou podem conter <strong className="text-cream">peixe cru</strong>,
          frutos do mar, leite, ovos, glúten, soja e gergelim. Preparamos tudo na mesma cozinha,
          então não é possível garantir ausência de traços.
        </p>
        <p>
          Se você tem alergia ou restrição alimentar, informe na observação do pedido e confirme
          com o atendimento antes de finalizar.
        </p>
      </Section>

      <Section heading="Uso do site">
        <p>
          Não é permitido usar o site para enviar pedidos falsos, automatizar requisições ou
          tentar acessar áreas restritas. Podemos recusar atendimento nesses casos.
        </p>
      </Section>

      <Section heading="Foro">
        <p>
          Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de{" "}
          {settings.city}/{settings.state} para dirimir eventuais controvérsias.
        </p>
      </Section>
    </LegalPage>
  );
}
