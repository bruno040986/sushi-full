import { NextResponse } from "next/server";
import { csvToBoolean, csvToInt, parseCsv, type ImportIssue } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { uniqueSlug } from "@/lib/slug";
import { parseJson } from "@/lib/validation";

export const dynamic = "force-dynamic";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/** Importa categorias em lote. Casa por `id`, e na falta dele pelo nome. */
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

  const categories = await prisma.category.findMany();
  const byId = new Map(categories.map((c) => [c.id, c]));
  const byName = new Map(categories.map((c) => [normalize(c.name), c]));

  const errors: ImportIssue[] = [];
  const create: { line: number; label: string; detail: string; data: CategoryData }[] = [];
  const update: {
    line: number;
    id: string;
    label: string;
    detail: string;
    data: CategoryData;
  }[] = [];
  let unchanged = 0;
  const seenNames = new Set<string>();

  rows.forEach((row, index) => {
    const line = index + 2;
    const name = (row.nome ?? "").trim();

    const existing =
      (row.id?.trim() && byId.get(row.id.trim())) || (name && byName.get(normalize(name))) || null;

    if (!existing && !name) {
      errors.push({ line, message: "Categoria nova sem a coluna `nome`" });
      return;
    }

    // Duas linhas com o mesmo nome criariam categorias duplicadas
    const key = normalize(name || existing!.name);
    if (!existing && seenNames.has(key)) {
      errors.push({ line, message: `"${name}" aparece mais de uma vez na planilha` });
      return;
    }
    seenNames.add(key);

    const sortOrder = csvToInt(row.ordem ?? "");
    if (sortOrder === undefined) {
      errors.push({ line, message: `Ordem inválida: "${row.ordem}"` });
      return;
    }

    const data: CategoryData = {
      name: name || existing!.name,
      imageUrl: (row.foto_url ?? "").trim() || existing?.imageUrl || null,
      active: csvToBoolean(row.ativo ?? "", existing?.active ?? true),
      sortOrder: sortOrder ?? existing?.sortOrder ?? 0,
    };

    if (!existing) {
      create.push({ line, label: data.name, detail: `ordem ${data.sortOrder}`, data });
      return;
    }

    const changed =
      data.name !== existing.name ||
      data.imageUrl !== existing.imageUrl ||
      data.active !== existing.active ||
      data.sortOrder !== existing.sortOrder;

    if (!changed) {
      unchanged++;
      return;
    }

    update.push({
      line,
      id: existing.id,
      label: data.name,
      detail: data.active === existing.active ? "campos atualizados" : data.active ? "reativada" : "desativada",
      data,
    });
  });

  const preview = {
    create: create.map(({ line, label, detail }) => ({ line, label, detail })),
    update: update.map(({ line, label, detail }) => ({ line, label, detail })),
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

  for (const row of create) {
    await prisma.category.create({
      data: { ...row.data, slug: await uniqueSlug("category", row.data.name) },
    });
  }

  for (const row of update) {
    await prisma.category.update({ where: { id: row.id }, data: row.data });
  }

  return NextResponse.json({ ...preview, applied: true });
}

type CategoryData = {
  name: string;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
};
