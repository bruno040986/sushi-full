import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { uniqueSlug } from "@/lib/slug";
import { categoryCreateSchema, parseJson, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = categoryCreateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const category = await prisma.category.create({
      data: { ...parsed.data, slug: await uniqueSlug("category", parsed.data.name) },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ category }, { status: 201 });
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
