import { NextResponse } from "next/server";
import {
  csvToBoolean,
  csvToCents,
  csvToInt,
  parseCsv,
  type ImportIssue,
} from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { uniqueSlug } from "@/lib/slug";
import { parseJson } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Action = "create" | "update" | "unchanged";

type Row = {
  line: number;
  action: Action;
  productId?: string;
  categoryId?: string;
  newCategoryName?: string;
  label: string;
  detail: string;
  data: {
    name: string;
    code: string | null;
    shortDescription: string | null;
    longDescription: string | null;
    priceCents: number;
    imageUrl: string | null;
    active: boolean;
    featured: boolean;
    sortOrder: number;
  };
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/**
 * Importa produtos de uma planilha.
 *
 * Duas passadas de propósito: `apply: false` devolve o que vai acontecer para
 * o dono conferir, e só depois `apply: true` grava. Importação às cegas em
 * cima de um cardápio de 91 itens é pedir para estragar dados.
 *
 * Como a linha casa com o banco: pela coluna `id` (que vem na exportação);
 * se estiver vazia, pelo `codigo`; se também não houver, é cadastro novo.
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
  if (rows.length > 1000) {
    return NextResponse.json({ error: "Limite de 1000 linhas por importação" }, { status: 422 });
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        shortDescription: true,
        longDescription: true,
        priceCents: true,
        imageUrl: true,
        active: true,
        featured: true,
        sortOrder: true,
        categoryId: true,
      },
    }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  const byId = new Map(products.map((p) => [p.id, p]));
  const byCode = new Map(products.filter((p) => p.code).map((p) => [p.code!, p]));
  const categoryByName = new Map(categories.map((c) => [normalize(c.name), c]));

  const errors: ImportIssue[] = [];
  const parsed: Row[] = [];
  // Categorias novas citadas na planilha, para criar de uma vez só
  const pendingCategories = new Map<string, string>();

  rows.forEach((row, index) => {
    const line = index + 2; // +1 do cabeçalho, +1 porque planilha começa em 1
    const fail = (message: string) => errors.push({ line, message });

    const name = (row.nome ?? "").trim();
    const existing =
      (row.id?.trim() && byId.get(row.id.trim())) ||
      (row.codigo?.trim() && byCode.get(row.codigo.trim())) ||
      null;

    if (!existing && !name) {
      fail("Produto novo sem a coluna `nome` preenchida");
      return;
    }

    // ─── Preço ──────────────────────────────────────────────────────────────
    const priceCents = csvToCents(row.preco ?? "");
    if (priceCents === undefined) {
      fail(`Preço inválido: "${row.preco}"`);
      return;
    }
    if (priceCents == null && !existing) {
      fail("Produto novo sem preço");
      return;
    }
    const finalPrice = priceCents ?? existing!.priceCents;
    if (finalPrice <= 0) {
      fail("O preço precisa ser maior que zero");
      return;
    }

    // ─── Categoria ──────────────────────────────────────────────────────────
    const categoryName = (row.categoria ?? "").trim();
    let categoryId = existing?.categoryId;
    let newCategoryName: string | undefined;

    if (categoryName) {
      const found = categoryByName.get(normalize(categoryName));
      if (found) {
        categoryId = found.id;
      } else {
        // Categoria que ainda não existe é criada junto — o dono não precisa
        // cadastrar antes só para conseguir subir a planilha.
        newCategoryName = categoryName;
        pendingCategories.set(normalize(categoryName), categoryName);
      }
    }

    if (!categoryId && !newCategoryName) {
      fail("Produto novo sem a coluna `categoria`");
      return;
    }

    const sortOrder = csvToInt(row.ordem ?? "");
    if (sortOrder === undefined) {
      fail(`Ordem inválida: "${row.ordem}"`);
      return;
    }

    const data = {
      name: name || existing!.name,
      code: (row.codigo ?? "").trim() || existing?.code || null,
      shortDescription: (row.descricao_curta ?? "").trim() || existing?.shortDescription || null,
      longDescription:
        (row.descricao_completa ?? "").trim() || existing?.longDescription || null,
      priceCents: finalPrice,
      // Foto é opcional: sem URL, o produto sobe sem foto e herda a da categoria
      imageUrl: (row.foto_url ?? "").trim() || existing?.imageUrl || null,
      active: csvToBoolean(row.ativo ?? "", existing?.active ?? true),
      featured: csvToBoolean(row.destaque ?? "", existing?.featured ?? false),
      sortOrder: sortOrder ?? existing?.sortOrder ?? 0,
    };

    if (!existing) {
      parsed.push({
        line,
        action: "create",
        categoryId,
        newCategoryName,
        label: data.name,
        detail: `${categoryName || "—"} · ${(data.priceCents / 100).toFixed(2)}`,
        data,
      });
      return;
    }

    const changed =
      data.name !== existing.name ||
      data.code !== existing.code ||
      data.shortDescription !== existing.shortDescription ||
      data.longDescription !== existing.longDescription ||
      data.priceCents !== existing.priceCents ||
      data.imageUrl !== existing.imageUrl ||
      data.active !== existing.active ||
      data.featured !== existing.featured ||
      data.sortOrder !== existing.sortOrder ||
      (categoryId && categoryId !== existing.categoryId) ||
      Boolean(newCategoryName);

    parsed.push({
      line,
      action: changed ? "update" : "unchanged",
      productId: existing.id,
      categoryId,
      newCategoryName,
      label: data.name,
      detail: describeChange(existing, data),
      data,
    });
  });

  const create = parsed.filter((row) => row.action === "create");
  const update = parsed.filter((row) => row.action === "update");
  const unchanged = parsed.filter((row) => row.action === "unchanged").length;

  const preview = {
    create: create.map(({ line, label, detail }) => ({ line, label, detail })),
    update: update.map(({ line, label, detail }) => ({ line, label, detail })),
    unchanged,
    errors,
    newCategories: [...pendingCategories.values()],
  };

  if (!body.apply) return NextResponse.json(preview);

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Corrija os erros da planilha antes de importar", ...preview },
      { status: 422 },
    );
  }

  // ─── Grava ────────────────────────────────────────────────────────────────
  for (const [key, name] of pendingCategories) {
    const category = await prisma.category.create({
      data: {
        name,
        slug: await uniqueSlug("category", name),
        sortOrder: categories.length + 1,
      },
      select: { id: true, name: true },
    });
    categoryByName.set(key, category);
  }

  const resolveCategory = (row: Row) =>
    row.newCategoryName
      ? categoryByName.get(normalize(row.newCategoryName))!.id
      : row.categoryId!;

  for (const row of create) {
    await prisma.product.create({
      data: {
        ...row.data,
        slug: await uniqueSlug("product", row.data.name),
        categoryId: resolveCategory(row),
      },
    });
  }

  for (const row of update) {
    await prisma.product.update({
      where: { id: row.productId },
      data: { ...row.data, categoryId: resolveCategory(row) },
    });
  }

  return NextResponse.json({ ...preview, applied: true });
}

/** Resume o que muda numa linha, para o dono conferir antes de aplicar. */
function describeChange(
  existing: { priceCents: number; active: boolean; name: string },
  next: { priceCents: number; active: boolean; name: string },
): string {
  const parts: string[] = [];
  if (next.priceCents !== existing.priceCents) {
    parts.push(
      `preço ${(existing.priceCents / 100).toFixed(2)} → ${(next.priceCents / 100).toFixed(2)}`,
    );
  }
  if (next.active !== existing.active) parts.push(next.active ? "reativado" : "desativado");
  if (next.name !== existing.name) parts.push(`renomeado de "${existing.name}"`);
  return parts.length > 0 ? parts.join(" · ") : "outros campos";
}
