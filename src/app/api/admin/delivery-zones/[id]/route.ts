import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { deliveryZoneUpdateSchema, parseJson, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const parsed = deliveryZoneUpdateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const zone = await prisma.deliveryZone.update({
      where: { id },
      data: parsed.data,
      include: { city: { select: { id: true, name: true, state: true } } },
    });
    return NextResponse.json({ zone });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Bairro não encontrado" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            error: "Dados inválidos",
            fieldErrors: { name: ["Esse bairro já está cadastrado nesta cidade"] },
          },
          { status: 422 },
        );
      }
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  // Pedidos antigos apontam para o bairro. Desativar preserva o histórico;
  // excluir só é permitido quando o bairro nunca foi usado.
  const usedCount = await prisma.order.count({ where: { deliveryZoneId: id } });
  if (usedCount > 0) {
    return NextResponse.json(
      {
        error: `Este bairro está em ${usedCount} pedido(s) e não pode ser excluído. Desative-o para parar de atendê-lo.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.deliveryZone.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Bairro não encontrado" }, { status: 404 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
