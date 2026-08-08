import { NextResponse } from "next/server";
import { csvToCents, parseCsv, type ImportIssue } from "@/lib/csv";
import { formatBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseJson } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Reajuste de preços em lote.
 *
 * O dono baixa a planilha com o preço atual, preenche `preco_novo` só onde
 * quer mudar e sobe o mesmo arquivo. Linha com `preco_novo` vazio não é
 * tocada — é isso que permite reajustar cinco itens sem risco para os outros
 * oitenta e seis.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await parseJson(request)) as { csv?: string; apply?: boolean } | null;
  if (!body?.csv?.trim()) {
    return NextResponse.json({ error: "Envie o conteúdo do arquivo" }, { status: 422 });
  }

  const rows = parseCsv(body.csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: "A planilha está vazia" }, { status: 422 });
  }

  const products = await prisma.product.findMany({
    select: { id: true, code: true, name: true, priceCents: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const byCode = new Map(products.filter((p) => p.code).map((p) => [p.code!, p]));

  const errors: ImportIssue[] = [];
  const changes: { id: string; label: string; detail: string; priceCents: number }[] = [];
  let unchanged = 0;

  rows.forEach((row, index) => {
    const line = index + 2;

    const raw = (row.preco_novo ?? "").trim();
    if (!raw) {
      unchanged++;
      return; // sem valor novo, a linha é ignorada
    }

    const product =
      (row.id?.trim() && byId.get(row.id.trim())) ||
      (row.codigo?.trim() && byCode.get(row.codigo.trim())) ||
      null;

    if (!product) {
      errors.push({ line, message: `Produto não encontrado (id/código: ${row.id || row.codigo})` });
      return;
    }

    const priceCents = csvToCents(raw);
    if (priceCents === undefined || priceCents == null) {
      errors.push({ line, message: `Preço novo inválido: "${raw}"` });
      return;
    }
    if (priceCents <= 0) {
      errors.push({ line, message: "O preço precisa ser maior que zero" });
      return;
    }
    if (priceCents === product.priceCents) {
      unchanged++;
      return;
    }

    const delta = ((priceCents - product.priceCents) / product.priceCents) * 100;
    changes.push({
      id: product.id,
      label: product.name,
      detail: `${formatBRL(product.priceCents)} → ${formatBRL(priceCents)} (${
        delta > 0 ? "+" : ""
      }${delta.toFixed(1)}%)`,
      priceCents,
    });
  });

  const preview = {
    create: [],
    update: changes.map(({ label, detail }, index) => ({ line: index + 2, label, detail })),
    unchanged,
    errors,
  };

  if (!body.apply) return NextResponse.json(preview);

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Corrija os erros da planilha antes de importar", ...preview },
      { status: 422 },
    );
  }

  await prisma.$transaction(
    changes.map((change) =>
      prisma.product.update({
        where: { id: change.id },
        data: { priceCents: change.priceCents },
      }),
    ),
  );

  return NextResponse.json({ ...preview, applied: true });
}
