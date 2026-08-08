import type { OrderStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

const VALID_STATUSES: OrderStatus[] = [
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "CANCELED",
];

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const search = params.get("q")?.trim();
  const take = Math.min(Number(params.get("limit") ?? 50), 200);

  const where: Prisma.OrderWhereInput = {};
  if (status && VALID_STATUSES.includes(status as OrderStatus)) {
    where.status = status as OrderStatus;
  }
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerPhone: { contains: search.replace(/\D/g, "") } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      items: { select: { nameSnapshot: true, quantity: true, lineTotalCents: true } },
      deliveryZone: { select: { name: true } },
    },
  });

  return NextResponse.json({ orders });
}
