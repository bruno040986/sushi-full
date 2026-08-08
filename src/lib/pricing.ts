/**
 * Cálculo de subtotal, frete e total. Função pura — a mesma roda no carrinho
 * (client) e no POST /api/orders (servidor), que recalcula tudo a partir dos
 * preços do banco em vez de confiar no payload.
 */

export type DeliveryFeeMode = "FIXED" | "BY_NEIGHBORHOOD";
export type Fulfillment = "DELIVERY" | "PICKUP";

export type PricingSettings = {
  deliveryFeeMode: DeliveryFeeMode;
  fixedDeliveryFeeCents: number;
  freeDeliveryThresholdCents: number | null;
  minOrderCents: number | null;
};

export type PricingZone = {
  id: string;
  name: string;
  feeCents: number;
  /** Bairro com frete sempre grátis */
  freeDelivery?: boolean;
  /** Limite de frete grátis só deste bairro. Sobrepõe o global. */
  freeDeliveryThresholdCents?: number | null;
};

export type PricingInput = {
  subtotalCents: number;
  fulfillment: Fulfillment;
  settings: PricingSettings;
  /** Obrigatório no modo BY_NEIGHBORHOOD quando for entrega */
  zone?: PricingZone | null;
};

export type PricingResult = {
  subtotalCents: number;
  /** null = ainda não dá para calcular (falta escolher o bairro) */
  deliveryFeeCents: number | null;
  totalCents: number | null;
  freeDeliveryApplied: boolean;
  /** Quanto falta para o frete grátis; null se não há regra ou já atingiu */
  amountMissingForFreeDeliveryCents: number | null;
  /** Limite de frete grátis aplicado — o do bairro quando existe, senão o global */
  freeDeliveryThresholdCents?: number | null;
  /** Subtotal abaixo do pedido mínimo (o frete não conta para o mínimo) */
  belowMinimum: boolean;
  minOrderCents: number | null;
};

export function computeTotals({
  subtotalCents,
  fulfillment,
  settings,
  zone,
}: PricingInput): PricingResult {
  const { freeDeliveryThresholdCents, minOrderCents } = settings;

  // O pedido mínimo compara com o SUBTOTAL — cobrar frete não deve empurrar
  // o cliente para cima do mínimo.
  const belowMinimum = minOrderCents != null && subtotalCents < minOrderCents;

  const base: Pick<PricingResult, "subtotalCents" | "belowMinimum" | "minOrderCents"> = {
    subtotalCents,
    belowMinimum,
    minOrderCents,
  };

  // 1. Retirada nunca tem taxa.
  if (fulfillment === "PICKUP") {
    return {
      ...base,
      deliveryFeeCents: 0,
      totalCents: subtotalCents,
      freeDeliveryApplied: false,
      amountMissingForFreeDeliveryCents: null,
    };
  }

  // 2. Sem bairro escolhido não há como calcular — o botão fica travado.
  if (!zone) {
    return {
      ...base,
      deliveryFeeCents: null,
      totalCents: null,
      freeDeliveryApplied: false,
      amountMissingForFreeDeliveryCents: null,
    };
  }

  // 3. Taxa base conforme o modo configurado.
  let feeCents =
    settings.deliveryFeeMode === "FIXED" ? settings.fixedDeliveryFeeCents : zone.feeCents;

  // 4. Bairro com frete sempre grátis ganha de qualquer outra regra.
  if (zone.freeDelivery) {
    return {
      ...base,
      deliveryFeeCents: 0,
      totalCents: subtotalCents,
      freeDeliveryApplied: true,
      amountMissingForFreeDeliveryCents: null,
    };
  }

  // 5. Limite de frete grátis: o do bairro sobrepõe o global quando existe.
  const threshold = zone.freeDeliveryThresholdCents ?? freeDeliveryThresholdCents;
  const freeDeliveryApplied = threshold != null && subtotalCents >= threshold;
  if (freeDeliveryApplied) feeCents = 0;

  const amountMissingForFreeDeliveryCents =
    threshold != null && !freeDeliveryApplied ? threshold - subtotalCents : null;

  return {
    ...base,
    deliveryFeeCents: feeCents,
    totalCents: subtotalCents + feeCents,
    freeDeliveryApplied,
    amountMissingForFreeDeliveryCents,
    /** Limite efetivamente aplicado (do bairro ou global) */
    freeDeliveryThresholdCents: threshold,
  };
}

/** Soma das linhas do carrinho. */
export function computeSubtotal(items: { priceCents: number; quantity: number }[]): number {
  return items.reduce((total, item) => total + item.priceCents * item.quantity, 0);
}
