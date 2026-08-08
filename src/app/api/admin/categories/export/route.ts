import { NextResponse } from "next/server";
import { booleanToCsv, toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export const CATEGORY_HEADERS = ["id", "nome", "foto_url", "ativo", "ordem"];

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const csv = toCsv(
    CATEGORY_HEADERS,
    categories.map((category) => [
      category.id,
      category.name,
      category.imageUrl ?? "",
      booleanToCsv(category.active),
      category.sortOrder,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      'Content-Disposition': 'attachment; filename="sushifull-categorias.csv"',
    },
  });
}
