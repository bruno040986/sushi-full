/**
 * Monta a mensagem do pedido para o WhatsApp.
 *
 * Puro e sem referência a `window` — dá para testar por snapshot e para o
 * servidor reaproveitar. Blocos sem conteúdo são omitidos inteiros.
 */
import { formatBRL, formatPhone, onlyDigits } from "@/lib/money";

export type OrderMessageItem = {
  name: string;
  quantity: number;
  lineTotalCents: number;
};

export type OrderMessageInput = {
  code?: string;
  storeName: string;
  items: OrderMessageItem[];

  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  freeDeliveryApplied: boolean;
  freeDeliveryThresholdCents: number | null;

  customerName: string;
  customerPhone: string;

  fulfillment: "DELIVERY" | "PICKUP";
  delivery?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    reference?: string;
    city: string;
    state: string;
    etaMinMinutes: number;
    etaMaxMinutes: number;
  };
  pickup?: {
    storeAddress: string;
    etaMinutes: number;
  };

  paymentMethodName: string;
  changeForCents?: number | null;
  changeDueCents?: number | null;

  notes?: string;
  siteUrl?: string;
};

/** O wa.me degrada acima de ~2000 caracteres em alguns clientes. */
const MAX_LENGTH = 1800;

export function buildOrderMessage(input: OrderMessageInput): string {
  const lines: string[] = [];
  const push = (line = "") => lines.push(line);

  const header = `🍣 *NOVO PEDIDO — ${input.storeName.toUpperCase()}*`;
  push(input.code ? `${header}  ·  #${input.code}` : header);
  push();

  // ─── Itens ───────────────────────────────────────────────────────────────
  push("*ITENS*");
  for (const item of input.items) {
    push(`▪ ${item.quantity}x ${item.name} — ${formatBRL(item.lineTotalCents)}`);
  }
  push();

  // ─── Resumo ──────────────────────────────────────────────────────────────
  push("*RESUMO*");
  push(`Subtotal: ${formatBRL(input.subtotalCents)}`);
  if (input.fulfillment === "DELIVERY") {
    if (input.freeDeliveryApplied) {
      const threshold = input.freeDeliveryThresholdCents;
      push(
        threshold != null
          ? `Taxa de entrega: GRÁTIS 🎉 (pedido acima de ${formatBRL(threshold)})`
          : "Taxa de entrega: GRÁTIS 🎉",
      );
    } else {
      push(`Taxa de entrega: ${formatBRL(input.deliveryFeeCents)}`);
    }
  }
  push(`*TOTAL: ${formatBRL(input.totalCents)}*`);
  push();

  // ─── Cliente ─────────────────────────────────────────────────────────────
  push("*CLIENTE*");
  push(`Nome: ${input.customerName.trim()}`);
  push(`Telefone: ${formatPhone(input.customerPhone)}`);
  push();

  // ─── Entrega ou retirada ─────────────────────────────────────────────────
  if (input.fulfillment === "DELIVERY" && input.delivery) {
    const d = input.delivery;
    push("🛵 *ENTREGA*");
    push(`Endereço: ${d.street}, nº ${d.number}`);
    if (d.complement?.trim()) push(`Complemento: ${d.complement.trim()}`);
    push(`Bairro: ${d.neighborhood}`);
    if (d.reference?.trim()) push(`Referência: ${d.reference.trim()}`);
    push(`Cidade: ${d.city}/${d.state}`);
    push(`Previsão: ${d.etaMinMinutes} a ${d.etaMaxMinutes} min`);
    push();
  } else if (input.pickup) {
    push("🏪 *RETIRADA NO BALCÃO*");
    push(`Endereço: ${input.pickup.storeAddress}`);
    push(`Previsão: pronto em ~${input.pickup.etaMinutes} min`);
    push();
  }

  // ─── Pagamento ───────────────────────────────────────────────────────────
  push("*PAGAMENTO*");
  push(`Forma: ${input.paymentMethodName}`);
  if (input.changeForCents != null) {
    const due = input.changeDueCents ?? input.changeForCents - input.totalCents;
    push(
      due > 0
        ? `Troco para: ${formatBRL(input.changeForCents)} (levar ${formatBRL(due)} de troco)`
        : `Troco para: ${formatBRL(input.changeForCents)} (não precisa de troco)`,
    );
  }

  // ─── Observações ─────────────────────────────────────────────────────────
  if (input.notes?.trim()) {
    push();
    push("*OBSERVAÇÕES*");
    push(input.notes.trim());
  }

  if (input.siteUrl) {
    push();
    push(`_Pedido enviado pelo site ${input.siteUrl}_`);
  }

  return truncate(lines.join("\n"));
}

function truncate(message: string): string {
  if (message.length <= MAX_LENGTH) return message;
  const cut = message.slice(0, MAX_LENGTH);
  const lastBreak = cut.lastIndexOf("\n");
  return `${cut.slice(0, lastBreak > 0 ? lastBreak : MAX_LENGTH)}\n… (mensagem longa, confira os itens com o atendente)`;
}

/** URL do wa.me com a mensagem já codificada. */
export function buildWhatsappUrl(phoneNumber: string, message: string): string {
  return `https://wa.me/${onlyDigits(phoneNumber)}?text=${encodeURIComponent(message)}`;
}
