import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { uniqueSlug } from "@/lib/slug";
import { parseJson, productUpdateSchema, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true } } },
  });

  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  return NextResponse.json({ product });
}

/**
 * Atualização parcial de verdade — só os campos enviados mudam.
 * (O projeto anterior apagava e recriava os registros filhos a cada save,
 * trocando os IDs e quebrando qualquer referência.)
 */
export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const parsed = productUpdateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

  // Renomear atualiza o slug, mantendo o link antigo previsível
  const slug =
    data.name && data.name !== existing.name
      ? await uniqueSlug("product", data.name, id)
      : undefined;

  const product = await prisma.product.update({
    where: { id },
    data: { ...data, ...(slug ? { slug } : {}) },
    include: { category: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ product });
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  // Se o produto já foi vendido, excluir apagaria o histórico. Nesse caso o
  // certo é desativar — a lista de pedidos precisa continuar íntegra.
  const soldCount = await prisma.orderItem.count({ where: { productId: id } });
  if (soldCount > 0) {
    return NextResponse.json(
      {
        error: `Este produto já saiu em ${soldCount} pedido(s) e não pode ser excluído. Desative-o para tirá-lo do cardápio.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
