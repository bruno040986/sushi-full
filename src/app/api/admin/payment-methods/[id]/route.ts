import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseJson, paymentMethodUpdateSchema, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const parsed = paymentMethodUpdateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const paymentMethod = await prisma.paymentMethod.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ paymentMethod });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Forma de pagamento não encontrada" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Dados inválidos", fieldErrors: { name: ["Já existe uma forma com esse nome"] } },
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
  try {
    await prisma.paymentMethod.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Forma de pagamento não encontrada" }, { status: 404 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
