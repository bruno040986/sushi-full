import { describe, expect, it } from "vitest";
import {
  computeSubtotal,
  computeTotals,
  type PricingSettings,
  type PricingZone,
} from "@/lib/pricing";

const FIXED: PricingSettings = {
  deliveryFeeMode: "FIXED",
  fixedDeliveryFeeCents: 500,
  freeDeliveryThresholdCents: 8000,
  minOrderCents: null,
};

const BY_ZONE: PricingSettings = { ...FIXED, deliveryFeeMode: "BY_NEIGHBORHOOD" };

/** Bairro comum: paga a taxa e segue a regra global de frete grátis. */
const ZONE: PricingZone = { id: "zone-1", name: "Parque Esplanada III", feeCents: 900 };

describe("computeSubtotal", () => {
  it("multiplica preço por quantidade", () => {
    expect(
      computeSubtotal([
        { priceCents: 3199, quantity: 2 },
        { priceCents: 4900, quantity: 1 },
      ]),
    ).toBe(11298);
  });

  it("carrinho vazio é zero", () => {
    expect(computeSubtotal([])).toBe(0);
  });
});

describe("retirada", () => {
  it("nunca cobra taxa, mesmo com frete configurado", () => {
    const result = computeTotals({
      subtotalCents: 3000,
      fulfillment: "PICKUP",
      settings: FIXED,
    });
    expect(result.deliveryFeeCents).toBe(0);
    expect(result.totalCents).toBe(3000);
    expect(result.freeDeliveryApplied).toBe(false);
  });

  it("não exige bairro", () => {
    const result = computeTotals({
      subtotalCents: 5000,
      fulfillment: "PICKUP",
      settings: BY_ZONE,
      zone: null,
    });
    expect(result.totalCents).toBe(5000);
  });
});

describe("bairro obrigatório na entrega", () => {
  it("sem bairro escolhido, não calcula — o botão fica travado", () => {
    for (const settings of [FIXED, BY_ZONE]) {
      const result = computeTotals({
        subtotalCents: 5000,
        fulfillment: "DELIVERY",
        settings,
        zone: null,
      });
      expect(result.deliveryFeeCents).toBeNull();
      expect(result.totalCents).toBeNull();
    }
  });
});

describe("modo taxa fixa", () => {
  it("cobra a taxa da loja, ignorando a do bairro", () => {
    const result = computeTotals({
      subtotalCents: 5000,
      fulfillment: "DELIVERY",
      settings: FIXED,
      zone: ZONE, // taxa de 900, mas o modo é fixo
    });
    expect(result.deliveryFeeCents).toBe(500);
    expect(result.totalCents).toBe(5500);
    expect(result.amountMissingForFreeDeliveryCents).toBe(3000);
  });

  it("zera a taxa exatamente no limite do frete grátis", () => {
    const result = computeTotals({
      subtotalCents: 8000,
      fulfillment: "DELIVERY",
      settings: FIXED,
      zone: ZONE,
    });
    expect(result.freeDeliveryApplied).toBe(true);
    expect(result.deliveryFeeCents).toBe(0);
    expect(result.totalCents).toBe(8000);
    expect(result.amountMissingForFreeDeliveryCents).toBeNull();
  });

  it("sem regra de frete grátis, sempre cobra", () => {
    const result = computeTotals({
      subtotalCents: 99999,
      fulfillment: "DELIVERY",
      settings: { ...FIXED, freeDeliveryThresholdCents: null },
      zone: ZONE,
    });
    expect(result.deliveryFeeCents).toBe(500);
    expect(result.amountMissingForFreeDeliveryCents).toBeNull();
  });
});

describe("modo por bairro", () => {
  it("usa a taxa do bairro escolhido", () => {
    const result = computeTotals({
      subtotalCents: 5000,
      fulfillment: "DELIVERY",
      settings: BY_ZONE,
      zone: ZONE,
    });
    expect(result.deliveryFeeCents).toBe(900);
    expect(result.totalCents).toBe(5900);
  });

  it("o frete grátis global também vale aqui", () => {
    const result = computeTotals({
      subtotalCents: 8500,
      fulfillment: "DELIVERY",
      settings: BY_ZONE,
      zone: ZONE,
    });
    expect(result.freeDeliveryApplied).toBe(true);
    expect(result.totalCents).toBe(8500);
  });
});

describe("regras próprias do bairro", () => {
  it("bairro com frete sempre grátis não cobra nada", () => {
    const perto: PricingZone = { ...ZONE, freeDelivery: true };
    const result = computeTotals({
      subtotalCents: 1000, // bem abaixo do limite global
      fulfillment: "DELIVERY",
      settings: BY_ZONE,
      zone: perto,
    });
    expect(result.deliveryFeeCents).toBe(0);
    expect(result.totalCents).toBe(1000);
    expect(result.freeDeliveryApplied).toBe(true);
    expect(result.amountMissingForFreeDeliveryCents).toBeNull();
  });

  it("limite do bairro sobrepõe o global — mais baixo", () => {
    const promo: PricingZone = { ...ZONE, freeDeliveryThresholdCents: 4000 };
    const result = computeTotals({
      subtotalCents: 4500, // abaixo do global (8000), acima do do bairro
      fulfillment: "DELIVERY",
      settings: BY_ZONE,
      zone: promo,
    });
    expect(result.freeDeliveryApplied).toBe(true);
    expect(result.deliveryFeeCents).toBe(0);
    expect(result.freeDeliveryThresholdCents).toBe(4000);
  });

  it("limite do bairro sobrepõe o global — mais alto", () => {
    const longe: PricingZone = { ...ZONE, freeDeliveryThresholdCents: 15000 };
    const result = computeTotals({
      subtotalCents: 9000, // já passaria do global, mas não do bairro
      fulfillment: "DELIVERY",
      settings: BY_ZONE,
      zone: longe,
    });
    expect(result.freeDeliveryApplied).toBe(false);
    expect(result.deliveryFeeCents).toBe(900);
    expect(result.amountMissingForFreeDeliveryCents).toBe(6000);
  });

  it("frete sempre grátis ganha de qualquer limite", () => {
    const zone: PricingZone = { ...ZONE, freeDelivery: true, freeDeliveryThresholdCents: 99999 };
    const result = computeTotals({
      subtotalCents: 100,
      fulfillment: "DELIVERY",
      settings: BY_ZONE,
      zone,
    });
    expect(result.deliveryFeeCents).toBe(0);
  });
});

describe("pedido mínimo", () => {
  const withMinimum: PricingSettings = { ...FIXED, minOrderCents: 4000 };

  it("compara com o SUBTOTAL, não com o total", () => {
    // 3.800 + 500 de frete = 4.300, acima do mínimo — mas o subtotal não é.
    const result = computeTotals({
      subtotalCents: 3800,
      fulfillment: "DELIVERY",
      settings: withMinimum,
      zone: ZONE,
    });
    expect(result.totalCents).toBe(4300);
    expect(result.belowMinimum).toBe(true);
  });

  it("libera exatamente no mínimo", () => {
    const result = computeTotals({
      subtotalCents: 4000,
      fulfillment: "DELIVERY",
      settings: withMinimum,
      zone: ZONE,
    });
    expect(result.belowMinimum).toBe(false);
  });

  it("vale também para retirada", () => {
    const result = computeTotals({
      subtotalCents: 1000,
      fulfillment: "PICKUP",
      settings: withMinimum,
    });
    expect(result.belowMinimum).toBe(true);
  });
});
