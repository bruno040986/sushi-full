import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { openingHoursSchema, parseJson, validationError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const hours = await prisma.openingHour.findMany({ orderBy: { weekday: "asc" } });
  return NextResponse.json({ hours });
}

/**
 * Recebe a grade inteira (7 dias) e faz upsert de cada linha.
 * Enviar tudo de uma vez evita estado meio-salvo se uma requisição falhar.
 */
export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = openingHoursSchema.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);

  await prisma.$transaction(
    parsed.data.map((day) =>
      prisma.openingHour.upsert({
        where: { weekday: day.weekday },
        update: {
          closed: day.closed,
          opensAtMin: day.opensAtMin,
          closesAtMin: day.closesAtMin,
        },
        create: day,
      }),
    ),
  );

  const hours = await prisma.openingHour.findMany({ orderBy: { weekday: "asc" } });
  return NextResponse.json({ hours });
}
