import { NextResponse } from "next/server";
import { getStoreStatus } from "@/lib/hours";
import { getOpeningHours, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Status aberto/fechado + a hora do SERVIDOR.
 *
 * O cliente usa `serverNowIso` para calcular um offset contra o próprio relógio
 * e recomputar o status localmente. Assim ninguém destrava o botão de pedido
 * mudando a hora do celular.
 */
export async function GET() {
  const now = new Date();
  const [settings, hours] = await Promise.all([getSettings(), getOpeningHours()]);
  const status = getStoreStatus(hours, now, settings.timezone);

  return NextResponse.json(
    {
      ...status,
      ordersEnabled: settings.ordersEnabled,
      closedMessage: settings.closedMessage,
      timezone: settings.timezone,
      hours,
      serverNowIso: now.toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
