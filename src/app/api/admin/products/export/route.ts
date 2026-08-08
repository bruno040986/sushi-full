import { NextResponse } from "next/server";
import { booleanToCsv, centsToCsv, toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

/** Cabeçalho da planilha completa. A coluna `id` é o que casa a linha no banco. */
export const PRODUCT_HEADERS = [
  "id",
  "codigo",
  "nome",
  "categoria",
  "preco",
  "descricao_curta",
  "descricao_completa",
  "foto_url",
  "ativo",
  "destaque",
  "ordem",
];

/** Cabeçalho da planilha de reajuste. */
export const PRICE_HEADERS = ["id", "codigo", "nome", "categoria", "preco_atual", "preco_novo"];

/**
 * Baixa o cardápio em CSV.
 *
 *   ?tipo=completo → todos os campos; serve de modelo para cadastrar em lote
 *   ?tipo=precos   → só preço, com a coluna do novo valor em branco
 */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const tipo = new URL(request.url).searchParams.get("tipo") ?? "completo";

  const products = await prisma.product.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    include: { category: { select: { name: true } } },
  });

  const isPriceSheet = tipo === "precos";

  const csv = isPriceSheet
    ? toCsv(
        PRICE_HEADERS,
        products.map((product) => [
          product.id,
          product.code ?? "",
          product.name,
          product.category.name,
          centsToCsv(product.priceCents),
          "", // preco_novo — o dono preenche só onde quer reajustar
        ]),
      )
    : toCsv(
        PRODUCT_HEADERS,
        products.map((product) => [
          product.id,
          product.code ?? "",
          product.name,
          product.category.name,
          centsToCsv(product.priceCents),
          product.shortDescription ?? "",
          product.longDescription ?? "",
          product.imageUrl ?? "",
          booleanToCsv(product.active),
          booleanToCsv(product.featured),
          product.sortOrder,
        ]),
      );

  const filename = isPriceSheet ? "sushifull-precos.csv" : "sushifull-produtos.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
