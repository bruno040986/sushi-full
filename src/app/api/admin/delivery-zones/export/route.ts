import { NextResponse } from "next/server";
import { booleanToCsv, centsToCsv, toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

/** Mesmo cabeçalho serve para cadastrar e para atualizar. */
export const ZONE_HEADERS = [
  "id",
  "bairro",
  "cidade",
  "uf",
  "taxa_entrega",
  "frete_gratis_acima_de",
  "previsao_min",
  "frete_sempre_gratis",
  "entregamos",
  "ordem",
];

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const zones = await prisma.deliveryZone.findMany({
    orderBy: [{ city: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    include: { city: { select: { name: true, state: true } } },
  });

  const csv = toCsv(
    ZONE_HEADERS,
    zones.map((zone) => [
      zone.id,
      zone.name,
      zone.city.name,
      zone.city.state,
      centsToCsv(zone.feeCents),
      centsToCsv(zone.freeDeliveryThresholdCents),
      zone.etaMinutes ?? "",
      booleanToCsv(zone.freeDelivery),
      booleanToCsv(zone.active),
      zone.sortOrder,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      'Content-Disposition': 'attachment; filename="sushifull-bairros.csv"',
    },
  });
}
