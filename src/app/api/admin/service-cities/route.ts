import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseJson, serviceCityCreateSchema, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const cities = await prisma.serviceCity.findMany({
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { zones: true } } },
  });
  return NextResponse.json({ cities });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = serviceCityCreateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  try {
    const city = await prisma.$transaction(async (tx) => {
      // Só uma cidade pode ser a padrão — marcar uma desmarca as outras.
      if (data.isDefault) {
        await tx.serviceCity.updateMany({ data: { isDefault: false } });
      }
      return tx.serviceCity.create({
        data,
        include: { _count: { select: { zones: true } } },
      });
    });
    return NextResponse.json({ city }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Dados inválidos", fieldErrors: { name: ["Essa cidade/UF já está cadastrada"] } },
        { status: 422 },
      );
    }
    throw error;
  }
}
