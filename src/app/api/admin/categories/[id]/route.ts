import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { uniqueSlug } from "@/lib/slug";
import { categoryUpdateSchema, parseJson, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const parsed = categoryUpdateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });

  const slug =
    data.name && data.name !== existing.name
      ? await uniqueSlug("category", data.name, id)
      : undefined;

  try {
    const category = await prisma.category.update({
      where: { id },
      data: { ...data, ...(slug ? { slug } : {}) },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Dados inválidos", fieldErrors: { name: ["Já existe uma categoria com esse nome"] } },
        { status: 422 },
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    return NextResponse.json(
      {
        error: `Esta categoria tem ${productCount} produto(s). Mova-os para outra categoria antes de excluir, ou apenas desative-a.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.category.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
