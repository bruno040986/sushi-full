import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

/**
 * Base de clientes. Só o painel autenticado lê isto — não existe rota pública
 * que devolva dados de cliente a partir de um telefone.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const search = params.get("q")?.trim();
  const orderBy = params.get("sort") === "spent" ? "totalSpentCents" : "lastOrderAt";
  const take = Math.min(Number(params.get("limit") ?? 100), 500);

  const where: Prisma.CustomerWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search.replace(/\D/g, "") } },
        ],
      }
    : {};

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { [orderBy]: "desc" },
    take,
    select: {
      id: true,
      name: true,
      phone: true,
      lastStreet: true,
      lastNumber: true,
      lastNeighborhood: true,
      ordersCount: true,
      totalSpentCents: true,
      firstOrderAt: true,
      lastOrderAt: true,
    },
  });

  return NextResponse.json({ customers });
}
