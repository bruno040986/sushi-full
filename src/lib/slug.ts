import { prisma } from "@/lib/prisma";

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Slug único: acrescenta -2, -3… se já existir.
 * `ignoreId` evita que um registro colida com ele mesmo ao ser editado.
 */
export async function uniqueSlug(
  table: "product" | "category",
  name: string,
  ignoreId?: string,
): Promise<string> {
  const base = slugify(name) || "item";

  for (let suffix = 0; suffix < 100; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const existing =
      table === "product"
        ? await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } });

    if (!existing || existing.id === ignoreId) return candidate;
  }

  return `${base}-${Date.now()}`;
}
