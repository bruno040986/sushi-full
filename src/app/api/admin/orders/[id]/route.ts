import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { orderStatusSchema, parseJson, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, deliveryZone: { select: { name: true } }, customer: true },
  });

  if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const parsed = orderStatusSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const { status, canceledReason } = parsed.data;

  const existing = await prisma.order.findUnique({
    where: { id },
    select: { status: true, confirmedAt: true, totalCents: true, customerId: true },
  });
  if (!existing) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  const wasCanceled = existing.status === "CANCELED";
  const willCancel = status === "CANCELED";

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: {
        status,
        canceledReason: willCancel ? canceledReason : null,
        // Marca a confirmação na primeira vez que sai de "aguardando"
        confirmedAt:
          existing.confirmedAt ??
          (status !== "AWAITING_CONFIRMATION" && !willCancel ? new Date() : null),
      },
      include: { items: true, deliveryZone: { select: { name: true } } },
    });

    // Cancelar devolve o valor ao acumulado do cliente; descancelar soma de volta.
    if (existing.customerId && wasCanceled !== willCancel) {
      const delta = willCancel ? -1 : 1;
      await tx.customer.update({
        where: { id: existing.customerId },
        data: {
          ordersCount: { increment: delta },
          totalSpentCents: { increment: delta * existing.totalCents },
        },
      });
    }

    return updated;
  });

  return NextResponse.json({ order });
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  const existing = await prisma.order.findUnique({
    where: { id },
    select: { status: true, totalCents: true, customerId: true },
  });
  if (!existing) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.delete({ where: { id } }); // OrderItem cai em cascade
      if (existing.customerId && existing.status !== "CANCELED") {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: {
            ordersCount: { decrement: 1 },
            totalSpentCents: { decrement: existing.totalCents },
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
