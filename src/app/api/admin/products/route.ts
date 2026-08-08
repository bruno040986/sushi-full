import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { uniqueSlug } from "@/lib/slug";
import { parseJson, productCreateSchema, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Lista TODOS os produtos, inclusive inativos — é a visão do painel. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const products = await prisma.product.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    include: { category: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = productCreateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true },
  });
  if (!category) {
    return NextResponse.json(
      { error: "Dados inválidos", fieldErrors: { categoryId: ["Categoria não encontrada"] } },
      { status: 422 },
    );
  }

  const product = await prisma.product.create({
    data: { ...data, slug: await uniqueSlug("product", data.name) },
    include: { category: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ product }, { status: 201 });
}
