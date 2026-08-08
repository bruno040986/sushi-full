import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseJson, serviceCityUpdateSchema, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const parsed = serviceCityUpdateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  // Desativar a cidade padrão deixaria o checkout sem cidade pré-selecionada.
  if (data.active === false) {
    const current = await prisma.serviceCity.findUnique({
      where: { id },
      select: { isDefault: true },
    });
    if (current?.isDefault) {
      return NextResponse.json(
        { error: "Marque outra cidade como padrão antes de desativar esta." },
        { status: 409 },
      );
    }
  }

  try {
    const city = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.serviceCity.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
      }
      return tx.serviceCity.update({
        where: { id },
        data,
        include: { _count: { select: { zones: true } } },
      });
    });
    return NextResponse.json({ city });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Cidade não encontrada" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            error: "Dados inválidos",
            fieldErrors: { name: ["Essa cidade/UF já está cadastrada"] },
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

  const zoneCount = await prisma.deliveryZone.count({ where: { cityId: id } });
  if (zoneCount > 0) {
    return NextResponse.json(
      {
        error: `Esta cidade tem ${zoneCount} bairro(s) cadastrado(s). Exclua-os antes, ou apenas desative a cidade.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.serviceCity.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Cidade não encontrada" }, { status: 404 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
