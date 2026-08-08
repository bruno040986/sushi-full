import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/pricing";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { getSettings } from "@/lib/store";
import { orderCreateSchema, parseJson, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Grava o pedido. Rota PÚBLICA — por isso:
 *
 *  1. Nenhum preço vem do cliente. Subtotal, frete e total são recalculados a
 *     partir do banco; o payload só diz QUAIS produtos e QUANTOS.
 *  2. Rate limit por IP.
 *  3. O status nasce AWAITING_CONFIRMATION: o cliente pode clicar em finalizar
 *     e desistir de enviar a mensagem no WhatsApp. Só o dono confirma.
 *
 * O carrinho chama isto em fire-and-forget (sem await) para não atrasar o
 * window.open do WhatsApp — um await aqui faria o Safari bloquear o popup.
 */
export async function POST(request: Request) {
  const limit = rateLimit(`orders:${clientIp(request)}`, { limit: 8, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitos pedidos em sequência. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = orderCreateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const settings = await getSettings();

  // Modalidade precisa estar habilitada
  if (input.fulfillment === "DELIVERY" && !settings.deliveryEnabled) {
    return NextResponse.json({ error: "Entrega indisponível no momento" }, { status: 409 });
  }
  if (input.fulfillment === "PICKUP" && !settings.pickupEnabled) {
    return NextResponse.json({ error: "Retirada indisponível no momento" }, { status: 409 });
  }

  // ─── Preços vêm do banco, nunca do payload ────────────────────────────────
  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true, category: { active: true } },
    select: { id: true, name: true, priceCents: true },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json(
      { error: "Algum item saiu do cardápio. Recarregue a página e monte o pedido de novo." },
      { status: 409 },
    );
  }

  const priceById = new Map(products.map((p) => [p.id, p]));
  const lines = input.items.map((item) => {
    const product = priceById.get(item.productId)!;
    return {
      productId: product.id,
      nameSnapshot: product.name,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
      lineTotalCents: product.priceCents * item.quantity,
    };
  });
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);

  // ─── Frete ────────────────────────────────────────────────────────────────
  // O bairro é a fonte da taxa e também de cidade/UF — nada disso vem do
  // payload, senão dava para forjar um frete menor.
  const zone =
    input.fulfillment === "DELIVERY" && input.deliveryZoneId
      ? await prisma.deliveryZone.findFirst({
          where: { id: input.deliveryZoneId, active: true, city: { active: true } },
          select: {
            id: true,
            name: true,
            feeCents: true,
            freeDelivery: true,
            freeDeliveryThresholdCents: true,
            etaMinutes: true,
            city: { select: { name: true, state: true } },
          },
        })
      : null;

  if (input.fulfillment === "DELIVERY" && !zone) {
    return NextResponse.json({ error: "Selecione um bairro atendido" }, { status: 422 });
  }

  const totals = computeTotals({
    subtotalCents,
    fulfillment: input.fulfillment,
    settings: {
      deliveryFeeMode: settings.deliveryFeeMode,
      fixedDeliveryFeeCents: settings.fixedDeliveryFeeCents,
      freeDeliveryThresholdCents: settings.freeDeliveryThresholdCents,
      minOrderCents: settings.minOrderCents,
    },
    zone,
  });

  if (totals.totalCents == null || totals.deliveryFeeCents == null) {
    return NextResponse.json({ error: "Não foi possível calcular o frete" }, { status: 422 });
  }
  if (totals.belowMinimum) {
    return NextResponse.json(
      { error: `O pedido mínimo é de R$ ${(settings.minOrderCents! / 100).toFixed(2)}` },
      { status: 422 },
    );
  }

  // ─── Pagamento e troco ────────────────────────────────────────────────────
  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: { id: input.paymentMethodId, active: true },
    select: { name: true, isCash: true },
  });
  if (!paymentMethod) {
    return NextResponse.json({ error: "Forma de pagamento indisponível" }, { status: 422 });
  }

  let changeForCents: number | null = null;
  let changeDueCents: number | null = null;
  if (paymentMethod.isCash && input.changeForCents != null) {
    if (input.changeForCents < totals.totalCents) {
      return NextResponse.json(
        { error: "O valor do troco precisa ser maior ou igual ao total" },
        { status: 422 },
      );
    }
    changeForCents = input.changeForCents;
    changeDueCents = input.changeForCents - totals.totalCents;
  }

  // ─── Cliente (consolidado por telefone) ───────────────────────────────────
  const now = new Date();
  const customer = await prisma.customer.upsert({
    where: { phone: input.customerPhone },
    create: {
      phone: input.customerPhone,
      name: input.customerName,
      lastStreet: input.street,
      lastNumber: input.number,
      lastComplement: input.complement,
      lastNeighborhood: zone?.name ?? null,
      lastCity: zone?.city.name ?? null,
      lastState: zone?.city.state ?? null,
      lastReference: input.reference,
      ordersCount: 1,
      totalSpentCents: totals.totalCents,
      firstOrderAt: now,
      lastOrderAt: now,
    },
    update: {
      name: input.customerName,
      lastStreet: input.street,
      lastNumber: input.number,
      lastComplement: input.complement,
      lastNeighborhood: zone?.name ?? null,
      lastCity: zone?.city.name ?? null,
      lastState: zone?.city.state ?? null,
      lastReference: input.reference,
      ordersCount: { increment: 1 },
      totalSpentCents: { increment: totals.totalCents },
      lastOrderAt: now,
    },
    select: { id: true },
  });

  // ─── Pedido ───────────────────────────────────────────────────────────────
  const orderData = {
    customerId: customer.id,
    fulfillment: input.fulfillment,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    street: input.fulfillment === "DELIVERY" ? input.street : null,
    number: input.fulfillment === "DELIVERY" ? input.number : null,
    complement: input.fulfillment === "DELIVERY" ? input.complement : null,
    neighborhood: input.fulfillment === "DELIVERY" ? (zone?.name ?? null) : null,
    city: input.fulfillment === "DELIVERY" ? (zone?.city.name ?? null) : null,
    state: input.fulfillment === "DELIVERY" ? (zone?.city.state ?? null) : null,
    reference: input.fulfillment === "DELIVERY" ? input.reference : null,
    deliveryZoneId: zone?.id ?? null,
    subtotalCents,
    deliveryFeeCents: totals.deliveryFeeCents,
    totalCents: totals.totalCents,
    freeDeliveryApplied: totals.freeDeliveryApplied,
    paymentMethodName: paymentMethod.name,
    changeForCents,
    changeDueCents,
    notes: input.notes,
    whatsappSentAt: now,
    items: { create: lines },
  };

  const order = await createOrderWithCode(orderData);

  return NextResponse.json(
    {
      id: order.id,
      code: order.code,
      subtotalCents,
      deliveryFeeCents: totals.deliveryFeeCents,
      totalCents: totals.totalCents,
      freeDeliveryApplied: totals.freeDeliveryApplied,
      changeDueCents,
    },
    { status: 201 },
  );
}

/**
 * Código sequencial legível (#0001, #0002…).
 *
 * Duas requisições simultâneas podem calcular o mesmo número; a unique de
 * `Order.code` rejeita a segunda e o laço tenta o próximo. Para o volume de um
 * restaurante isso basta — não vale a complexidade de uma sequence dedicada.
 */
async function createOrderWithCode(data: Prisma.OrderUncheckedCreateInput | object) {
  const total = await prisma.order.count();

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = String(total + 1 + attempt).padStart(4, "0");
    try {
      return await prisma.order.create({
        data: { ...(data as Prisma.OrderUncheckedCreateInput), code },
        select: { id: true, code: true },
      });
    } catch (error) {
      const isDuplicateCode =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!isDuplicateCode) throw error;
    }
  }

  throw new Error("Não foi possível gerar um código de pedido único");
}
