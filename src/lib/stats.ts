import { nowInTimezone } from "@/lib/hours";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/store";

/**
 * Pedidos que não contam como faturamento.
 *
 * `AWAITING_CONFIRMATION` fica de fora de propósito: o cliente pode ter
 * clicado em finalizar e desistido de enviar a mensagem no WhatsApp. Só entra
 * no número depois que o dono confirma que o pedido chegou.
 */
const NOT_BILLABLE = ["AWAITING_CONFIRMATION", "CANCELED"] as const;

const IN_PROGRESS = [
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "READY_FOR_PICKUP",
] as const;

/**
 * Início do dia de operação no fuso da loja, em UTC.
 * Sem isso, "hoje" na Vercel (UTC) começaria às 21h de ontem em São Paulo.
 */
function startOfLocalDay(now: Date, timeZone: string): Date {
  const { minutes } = nowInTimezone(now, timeZone);
  const midnight = new Date(now);
  midnight.setUTCSeconds(0, 0);
  return new Date(midnight.getTime() - minutes * 60_000);
}

export async function getDashboardStats() {
  const settings = await getSettings();
  const now = new Date();
  const dayStart = startOfLocalDay(now, settings.timezone);
  const periodStart = new Date(dayStart.getTime() - 29 * 24 * 60 * 60 * 1000);

  const [awaiting, inProgress, today, last30, total, inactive, customers, topSellers] =
    await Promise.all([
      prisma.order.count({ where: { status: "AWAITING_CONFIRMATION" } }),
      prisma.order.count({ where: { status: { in: [...IN_PROGRESS] } } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: dayStart }, status: { notIn: [...NOT_BILLABLE] } },
        _sum: { totalCents: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: periodStart }, status: { notIn: [...NOT_BILLABLE] } },
        _sum: { totalCents: true },
        _count: true,
      }),
      prisma.product.count(),
      prisma.product.count({ where: { active: false } }),
      prisma.customer.count(),
      prisma.orderItem.groupBy({
        by: ["nameSnapshot"],
        where: {
          order: { createdAt: { gte: periodStart }, status: { notIn: [...NOT_BILLABLE] } },
        },
        _sum: { quantity: true, lineTotalCents: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 8,
      }),
    ]);

  const monthRevenue = last30._sum.totalCents ?? 0;

  return {
    awaiting,
    inProgress,
    today: { orders: today._count, revenueCents: today._sum.totalCents ?? 0 },
    last30Days: {
      orders: last30._count,
      revenueCents: monthRevenue,
      averageTicketCents: last30._count ? Math.round(monthRevenue / last30._count) : 0,
    },
    catalog: { total, inactive },
    customers,
    topSellers: topSellers.map((row) => ({
      name: row.nameSnapshot,
      quantity: row._sum.quantity ?? 0,
      revenueCents: row._sum.lineTotalCents ?? 0,
    })),
  };
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
