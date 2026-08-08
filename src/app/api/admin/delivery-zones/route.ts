import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { deliveryZoneCreateSchema, parseJson, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const zones = await prisma.deliveryZone.findMany({
    orderBy: [{ city: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    include: { city: { select: { id: true, name: true, state: true } } },
  });
  return NextResponse.json({ zones });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = deliveryZoneCreateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const city = await prisma.serviceCity.findUnique({
    where: { id: parsed.data.cityId },
    select: { id: true },
  });
  if (!city) {
    return NextResponse.json(
      { error: "Dados inválidos", fieldErrors: { cityId: ["Cidade não encontrada"] } },
      { status: 422 },
    );
  }

  try {
    const zone = await prisma.deliveryZone.create({
      data: parsed.data,
      include: { city: { select: { id: true, name: true, state: true } } },
    });
    return NextResponse.json({ zone }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          fieldErrors: { name: ["Esse bairro já está cadastrado nesta cidade"] },
        },
        { status: 422 },
      );
    }
    throw error;
  }
}
