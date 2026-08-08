import { describe, expect, it } from "vitest";
import { buildOrderMessage, buildWhatsappUrl, type OrderMessageInput } from "@/lib/whatsapp";

const BASE: OrderMessageInput = {
  code: "0142",
  storeName: "Sushi Full",
  items: [
    { name: "Combo 3 — 28 peças", quantity: 2, lineTotalCents: 9800 },
    { name: "Temaki de salmão e cebolinha", quantity: 1, lineTotalCents: 3199 },
  ],
  subtotalCents: 12999,
  deliveryFeeCents: 500,
  totalCents: 13499,
  freeDeliveryApplied: false,
  freeDeliveryThresholdCents: 8000,
  customerName: "Bruno Rodrigues",
  customerPhone: "61993292359",
  fulfillment: "DELIVERY",
  delivery: {
    street: "Q 33, Lote 22",
    number: "15",
    complement: "Casa 2",
    neighborhood: "Parque Esplanada III",
    reference: "Portão azul",
    city: "Valparaíso de Goiás",
    state: "GO",
    etaMinMinutes: 40,
    etaMaxMinutes: 70,
  },
  paymentMethodName: "Dinheiro",
  changeForCents: 20000,
  changeDueCents: 6501,
  notes: "Sem cebolinha, por favor.",
  siteUrl: "sushifull.com.br",
};

describe("buildOrderMessage — entrega completa", () => {
  const message = buildOrderMessage(BASE);

  it("bate com o formato esperado", () => {
    expect(message).toMatchInlineSnapshot(`
      "🍣 *NOVO PEDIDO — SUSHI FULL*  ·  #0142

      *ITENS*
      ▪ 2x Combo 3 — 28 peças — R$ 98,00
      ▪ 1x Temaki de salmão e cebolinha — R$ 31,99

      *RESUMO*
      Subtotal: R$ 129,99
      Taxa de entrega: R$ 5,00
      *TOTAL: R$ 134,99*

      *CLIENTE*
      Nome: Bruno Rodrigues
      Telefone: (61) 99329-2359

      🛵 *ENTREGA*
      Endereço: Q 33, Lote 22, nº 15
      Complemento: Casa 2
      Bairro: Parque Esplanada III
      Referência: Portão azul
      Cidade: Valparaíso de Goiás/GO
      Previsão: 40 a 70 min

      *PAGAMENTO*
      Forma: Dinheiro
      Troco para: R$ 200,00 (levar R$ 65,01 de troco)

      *OBSERVAÇÕES*
      Sem cebolinha, por favor.

      _Pedido enviado pelo site sushifull.com.br_"
    `);
  });
});

describe("variações", () => {
  it("frete grátis substitui a linha da taxa", () => {
    const message = buildOrderMessage({
      ...BASE,
      deliveryFeeCents: 0,
      freeDeliveryApplied: true,
      totalCents: 12999,
    });
    expect(message).toContain("Taxa de entrega: GRÁTIS 🎉 (pedido acima de R$ 80,00)");
    expect(message).not.toContain("Taxa de entrega: R$ 5,00");
  });

  it("retirada troca o bloco e omite a taxa", () => {
    const message = buildOrderMessage({
      ...BASE,
      fulfillment: "PICKUP",
      delivery: undefined,
      deliveryFeeCents: 0,
      totalCents: 12999,
      pickup: { storeAddress: "Q 33, Lote 22 — Parque Esplanada III", etaMinutes: 30 },
    });
    expect(message).toContain("🏪 *RETIRADA NO BALCÃO*");
    expect(message).toContain("Previsão: pronto em ~30 min");
    expect(message).not.toContain("Taxa de entrega");
    expect(message).not.toContain("🛵");
  });

  it("omite blocos opcionais vazios", () => {
    const message = buildOrderMessage({
      ...BASE,
      notes: undefined,
      changeForCents: null,
      changeDueCents: null,
      delivery: { ...BASE.delivery!, complement: "", reference: "" },
    });
    expect(message).not.toContain("OBSERVAÇÕES");
    expect(message).not.toContain("Troco para");
    expect(message).not.toContain("Complemento:");
    expect(message).not.toContain("Referência:");
  });

  it("avisa quando o troco dá zero", () => {
    const message = buildOrderMessage({ ...BASE, changeForCents: 13499, changeDueCents: 0 });
    expect(message).toContain("(não precisa de troco)");
  });

  it("funciona sem código de pedido", () => {
    const message = buildOrderMessage({ ...BASE, code: undefined });
    expect(message.split("\n")[0]).toBe("🍣 *NOVO PEDIDO — SUSHI FULL*");
  });

  it("trunca pedidos gigantes sem cortar no meio da linha", () => {
    const message = buildOrderMessage({
      ...BASE,
      items: Array.from({ length: 60 }, (_, i) => ({
        name: `Item de nome bem comprido para forçar o truncamento número ${i}`,
        quantity: 2,
        lineTotalCents: 5000,
      })),
    });
    expect(message.length).toBeLessThan(2000);
    expect(message).toContain("confira os itens com o atendente");
  });
});

describe("buildWhatsappUrl", () => {
  it("codifica a mensagem e limpa o número", () => {
    const url = buildWhatsappUrl("(61) 99329-2359", "Olá\nmundo & cia");
    expect(url).toBe("https://wa.me/61993292359?text=Ol%C3%A1%0Amundo%20%26%20cia");
  });
});
