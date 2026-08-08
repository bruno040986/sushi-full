import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseJson, paymentMethodCreateSchema, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Inclui as inativas — é a visão do painel. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const paymentMethods = await prisma.paymentMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ paymentMethods });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = paymentMethodCreateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const paymentMethod = await prisma.paymentMethod.create({ data: parsed.data });
    return NextResponse.json({ paymentMethod }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Dados inválidos", fieldErrors: { name: ["Já existe uma forma com esse nome"] } },
        { status: 422 },
      );
    }
    throw error;
  }
}
